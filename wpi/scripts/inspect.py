import sys, glob, openpyxl, os
for f in sorted(glob.glob(sys.argv[1]+'/*.xltx')):
    try:
        wb = openpyxl.load_workbook(f, data_only=True)
    except Exception as e:
        print(os.path.basename(f), 'ERR', e); continue
    print('==', os.path.basename(f), [(ws.title, ws.max_row, ws.max_column) for ws in wb.worksheets])
f = sorted(glob.glob(sys.argv[1]+'/*Kettingreiniger*'))[0]
wb = openpyxl.load_workbook(f, data_only=True)
for ws in wb.worksheets:
    print('#### SHEET', ws.title)
    for r in ws.iter_rows(min_row=1, max_row=40):
        vals = [(c.coordinate, str(c.value)[:70]) for c in r if c.value is not None]
        if vals: print(vals)
