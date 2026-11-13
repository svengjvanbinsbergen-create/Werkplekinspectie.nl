package nl.werkplekinspectie.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Binder;
import android.os.Bundle;
import android.os.IBinder;
import android.os.Parcel;
import android.os.RemoteException;
import android.util.Log;
import android.widget.Toast;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Opent de web-app als Trusted Web Activity (TWA) in Chrome.
 *
 * Waarom geen WebView: spraakinvoer (webkitSpeechRecognition) werkt niet in een Android-WebView,
 * wel in Chrome. Een TWA is Chrome zelf, schermvullend en zonder adresbalk, mits de site via
 * /.well-known/assetlinks.json bevestigt dat deze app (package-id + certificaat) erbij hoort.
 * Lukt die controle niet, dan toont Chrome de site gewoon met een smalle adresbalk erboven.
 *
 * Dit is een kleine eigen implementatie van wat androidx.browser / android-browser-helper doen
 * (die bibliotheken stonden niet tot onze beschikking bij het bouwen). Het protocol is het
 * openbare Custom Tabs-protocol:
 *  1. bind aan de CustomTabsService van de browser;
 *  2. maak een sessie (ICustomTabsService.newSession, met een callback-Binder van ons);
 *  3. start een ACTION_VIEW-intent met die sessie en LAUNCH_AS_TRUSTED_WEB_ACTIVITY=true.
 * Chrome koppelt de sessie aan onze app (via de aanroeper van newSession) en controleert de
 * Digital Asset Links. Transactiecodes en namen komen uit de AIDL-bestanden van androidx.browser
 * (android/support/customtabs/ICustomTabsService.aidl en ICustomTabsCallback.aidl).
 */
public class LauncherActivity extends Activity {
    private static final String TAG = "WerkplekinspectieTWA";

    private static final String ACTION_CUSTOM_TABS_SERVICE =
            "android.support.customtabs.action.CustomTabsService";
    private static final String CATEGORY_TWA =
            "androidx.browser.trusted.category.TrustedWebActivities";
    private static final String SERVICE_DESCRIPTOR =
            "android.support.customtabs.ICustomTabsService";
    private static final String CALLBACK_DESCRIPTOR =
            "android.support.customtabs.ICustomTabsCallback";
    /** AIDL: boolean newSession(in ICustomTabsCallback callback) = 2; */
    private static final int TRANSACTION_NEW_SESSION = IBinder.FIRST_CALL_TRANSACTION + 2;
    /** AIDL: Bundle extraCallbackWithResult(String, in Bundle) = 6; (enige callback met antwoord) */
    private static final int CALLBACK_EXTRA_WITH_RESULT = IBinder.FIRST_CALL_TRANSACTION + 6;

    private static final String EXTRA_SESSION = "android.support.customtabs.extra.SESSION";
    private static final String EXTRA_LAUNCH_AS_TWA =
            "android.support.customtabs.extra.LAUNCH_AS_TRUSTED_WEB_ACTIVITY";
    private static final String EXTRA_TOOLBAR_COLOR =
            "android.support.customtabs.extra.TOOLBAR_COLOR";
    private static final String EXTRA_NAVIGATION_BAR_COLOR =
            "androidx.browser.customtabs.extra.NAVIGATION_BAR_COLOR";

    private static final String STATE_BROWSER_GESTART = "nl.werkplekinspectie.app.BROWSER_GESTART";

    /** Spraakinvoer werkt in Chrome; daarom gaat Chrome voor, ook als een andere browser standaard is. */
    private static final String[] VOORKEUR_BROWSERS = {
            "com.android.chrome", "com.chrome.beta", "com.chrome.dev", "com.chrome.canary",
    };

    private static int sLevend;

    private boolean mBrowserGestart;
    private boolean mVernietigd;
    private ServiceConnection mVerbinding;
    private final Binder mCallback = new CallbackBinder();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        sLevend++;

        // TWA draait al en iemand tikt op het icoon: Android brengt de bestaande taak naar voren.
        if (sLevend > 1 && getIntent().getData() == null) {
            finish();
            return;
        }
        if (herstartInNieuweTaak()) {
            finish();
            return;
        }
        // Deze activity is op de achtergrond opgeruimd nadat Chrome al gestart was.
        if (savedInstanceState != null && savedInstanceState.getBoolean(STATE_BROWSER_GESTART)) {
            finish();
            return;
        }

        final Uri url = bepaalUrl();
        final String browser = kiesTwaBrowser();
        if (browser == null) {
            Log.w(TAG, "Geen browser met TWA-ondersteuning gevonden; open in gewone browser.");
            openInBrowser(url, null);
            return;
        }

        mVerbinding = new ServiceConnection() {
            @Override
            public void onServiceConnected(ComponentName name, IBinder service) {
                if (mVernietigd || mBrowserGestart) return;
                if (maakSessie(service)) {
                    startTwa(url, browser);
                } else {
                    Log.w(TAG, "Sessie maken mislukt; open zonder TWA.");
                    openInBrowser(url, browser);
                }
            }

            @Override
            public void onServiceDisconnected(ComponentName name) {
                // Niets te doen: de TWA draait in Chrome door.
            }
        };

        Intent dienst = new Intent(ACTION_CUSTOM_TABS_SERVICE).setPackage(browser);
        boolean gebonden;
        try {
            gebonden = bindService(dienst, mVerbinding, Context.BIND_AUTO_CREATE);
        } catch (SecurityException e) {
            gebonden = false;
        }
        if (!gebonden) {
            mVerbinding = null;
            openInBrowser(url, browser);
        }
    }

    /** Startpagina, of een link naar de eigen site waarmee de app geopend werd. */
    private Uri bepaalUrl() {
        Uri standaard = new Uri.Builder()
                .scheme("https")
                .authority(getString(R.string.web_host))
                .encodedPath(getString(R.string.start_pad))
                .build();
        Uri data = getIntent().getData();
        if (data != null
                && "https".equalsIgnoreCase(data.getScheme())
                && getString(R.string.web_host).equalsIgnoreCase(data.getHost())) {
            return data;
        }
        return standaard;
    }

    /**
     * Kiest de browser: eerst Chrome, dan de standaardbrowser, dan een andere browser die TWA's
     * ondersteunt. Geeft null als geen enkele browser TWA's kan tonen.
     */
    private String kiesTwaBrowser() {
        PackageManager pm = getPackageManager();
        Set<String> twa = new LinkedHashSet<>();
        List<ResolveInfo> diensten = pm.queryIntentServices(
                new Intent(ACTION_CUSTOM_TABS_SERVICE), PackageManager.GET_RESOLVED_FILTER);
        if (diensten != null) {
            for (ResolveInfo ri : diensten) {
                if (ri.serviceInfo == null || ri.filter == null) continue;
                if (ri.filter.hasCategory(CATEGORY_TWA)) twa.add(ri.serviceInfo.packageName);
            }
        }
        for (String pakket : VOORKEUR_BROWSERS) {
            if (twa.contains(pakket)) return pakket;
        }
        ResolveInfo standaard = pm.resolveActivity(
                new Intent(Intent.ACTION_VIEW, Uri.parse("https://")),
                PackageManager.MATCH_DEFAULT_ONLY);
        if (standaard != null && standaard.activityInfo != null
                && twa.contains(standaard.activityInfo.packageName)) {
            return standaard.activityInfo.packageName;
        }
        return twa.isEmpty() ? null : twa.iterator().next();
    }

    /** ICustomTabsService.newSession(callback), met de hand ge-marshald zoals de AIDL-proxy. */
    private boolean maakSessie(IBinder dienst) {
        Parcel data = Parcel.obtain();
        Parcel antwoord = Parcel.obtain();
        try {
            data.writeInterfaceToken(SERVICE_DESCRIPTOR);
            data.writeStrongBinder(mCallback);
            if (!dienst.transact(TRANSACTION_NEW_SESSION, data, antwoord, 0)) return false;
            antwoord.readException();
            return antwoord.readInt() != 0;
        } catch (RemoteException | RuntimeException e) {
            Log.w(TAG, "newSession mislukt", e);
            return false;
        } finally {
            antwoord.recycle();
            data.recycle();
        }
    }

    @SuppressWarnings("deprecation") // getColor(int): werkt op alle versies vanaf minSdk 21
    private void startTwa(Uri url, String browser) {
        Intent intent = new Intent(Intent.ACTION_VIEW, url);
        intent.setPackage(browser);
        Bundle sessie = new Bundle();
        sessie.putBinder(EXTRA_SESSION, mCallback);
        intent.putExtras(sessie);
        intent.putExtra(EXTRA_LAUNCH_AS_TWA, true);
        int thema = getResources().getColor(R.color.thema);
        intent.putExtra(EXTRA_TOOLBAR_COLOR, thema);
        intent.putExtra(EXTRA_NAVIGATION_BAR_COLOR, thema);
        try {
            startActivity(intent);
            klaar();
        } catch (ActivityNotFoundException | SecurityException e) {
            Log.w(TAG, "TWA starten mislukt", e);
            openInBrowser(url, null);
        }
    }

    /** Terugval: gewone browser (met adresbalk). */
    private void openInBrowser(Uri url, String browser) {
        Intent intent = new Intent(Intent.ACTION_VIEW, url);
        intent.addCategory(Intent.CATEGORY_BROWSABLE);
        if (browser != null) intent.setPackage(browser);
        try {
            startActivity(intent);
        } catch (ActivityNotFoundException e) {
            if (browser != null) {
                openInBrowser(url, null);
                return;
            }
            Toast.makeText(this, R.string.geen_browser, Toast.LENGTH_LONG).show();
        }
        klaar();
    }

    private void klaar() {
        mBrowserGestart = true;
        finish();
    }

    /**
     * Altijd in een eigen taak draaien (één "Werkplekinspectie" in Recente apps), ook als een link
     * uit een andere app ons zonder FLAG_ACTIVITY_NEW_TASK opent. Zelfde aanpak als
     * android-browser-helper.
     */
    private boolean herstartInNieuweTaak() {
        int vlaggen = getIntent().getFlags();
        boolean nieuweTaak = (vlaggen & Intent.FLAG_ACTIVITY_NEW_TASK) != 0;
        boolean nieuwDocument = (vlaggen & Intent.FLAG_ACTIVITY_NEW_DOCUMENT) != 0;
        if (nieuweTaak && !nieuwDocument) return false;
        Intent opnieuw = new Intent(getIntent());
        opnieuw.setFlags((vlaggen | Intent.FLAG_ACTIVITY_NEW_TASK) & ~Intent.FLAG_ACTIVITY_NEW_DOCUMENT);
        startActivity(opnieuw);
        return true;
    }

    @Override
    protected void onRestart() {
        super.onRestart();
        if (mBrowserGestart) finish();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        outState.putBoolean(STATE_BROWSER_GESTART, mBrowserGestart);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        sLevend--;
        mVernietigd = true;
        if (mVerbinding != null) {
            try {
                unbindService(mVerbinding);
            } catch (IllegalArgumentException ignored) {
                // Was al losgekoppeld.
            }
            mVerbinding = null;
        }
    }

    /**
     * Onze kant van ICustomTabsCallback. Chrome meldt hier navigatie-gebeurtenissen; die hebben we
     * niet nodig. We bevestigen elke aanroep netjes zodat Chrome geen fout krijgt.
     */
    private static final class CallbackBinder extends Binder {
        CallbackBinder() {
            attachInterface(null, CALLBACK_DESCRIPTOR);
        }

        @Override
        protected boolean onTransact(int code, Parcel data, Parcel reply, int flags)
                throws RemoteException {
            if (code >= FIRST_CALL_TRANSACTION && code <= LAST_CALL_TRANSACTION) {
                if (reply != null && (flags & FLAG_ONEWAY) == 0) {
                    reply.writeNoException();
                    if (code == CALLBACK_EXTRA_WITH_RESULT) reply.writeInt(0); // null-Bundle
                }
                return true;
            }
            return super.onTransact(code, data, reply, flags);
        }
    }
}
