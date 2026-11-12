#!/bin/bash
set -e
cd /home/claude/wpi/run/build && python3 build_rapport.py 2>&1 | grep -v "^$" | tail -25
cd ../out && python3 /mnt/skills/public/docx/scripts/office/soffice.py --headless --convert-to pdf --outdir . "WPI-20261105-DAM-C2 Voorbeeldrapport.docx" >/dev/null 2>&1
pdfinfo "WPI-20261105-DAM-C2 Voorbeeldrapport.pdf" | grep -E "Pages|Page size"
rm -rf /tmp/pg && mkdir /tmp/pg && pdftoppm -jpeg -r 80 "WPI-20261105-DAM-C2 Voorbeeldrapport.pdf" /tmp/pg/p
