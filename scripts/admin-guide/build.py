# Builds docs/admin-guide.pdf from docs/admin-guide.md.
#   python3 scripts/admin-guide/build.py
# Needs: pip install markdown playwright  (and a Chromium for Playwright)
import base64
import pathlib
import re

import markdown
from playwright.sync_api import sync_playwright

root = pathlib.Path(__file__).resolve().parents[2]
src = (root / "docs" / "admin-guide.md").read_text(encoding="utf-8")
logo = base64.b64encode((root / "public" / "brand" / "logo.png").read_bytes()).decode()

# Front matter lines: "title: ..." / "subtitle: ..." / "version: ..." before the first "---".
meta, body = src.split("\n---\n", 1)
info = dict(line.split(": ", 1) for line in meta.strip().splitlines())

html_body = markdown.markdown(body, extensions=["tables", "toc", "attr_list", "sane_lists"])

# Chapters (h1) start a new page and get a number; contents list built from h1/h2.
toc, n = [], 0
def number(m):
    global n
    n += 1
    toc.append((n, m.group(2), m.group(1), []))
    return f'<h1 id="{m.group(1)}"><span class="num">{n:02d}</span>{m.group(2)}</h1>'
html_body = re.sub(r'<h1 id="([^"]+)">(.*?)</h1>', number, html_body)
for m in re.finditer(r'<h1 id="([^"]+)">.*?</h1>|<h2 id="([^"]+)">(.*?)</h2>', html_body):
    if m.group(2) and toc:
        toc[-1][3].append((m.group(2), m.group(3)))

toc_html = "".join(
    f'<li><a href="#{cid}"><span class="tn">{i:02d}</span><b>{title}</b></a>'
    + (f'<p>{" · ".join(t for _, t in subs)}</p>' if subs else "")
    + "</li>"
    for i, title, cid, subs in toc
)

css = (pathlib.Path(__file__).parent / "guide.css").read_text(encoding="utf-8")
page = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><title>{info['title']}</title><style>{css}</style></head>
<body>
<section class="cover">
  <img src="data:image/png;base64,{logo}" alt="">
  <p class="kicker">Spinex IT Solutions</p>
  <h1 class="ctitle">{info['title']}</h1>
  <p class="csub">{info['subtitle']}</p>
  <p class="cmeta">{info['version']}</p>
</section>
<section class="toc"><h2 class="toch">Contents</h2><ol>{toc_html}</ol></section>
<main>{html_body}</main>
</body></html>"""
out_html = root / "docs" / "admin-guide.html"
out_html.write_text(page, encoding="utf-8")

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    pg.goto(out_html.as_uri())
    pg.pdf(
        path=str(root / "docs" / "admin-guide.pdf"),
        format="A4",
        print_background=True,
        display_header_footer=True,
        header_template="<span></span>",
        footer_template='<div style="width:100%;font:8px Inter,sans-serif;color:#8a8597;padding:0 18mm;display:flex;justify-content:space-between"><span>Spinex Admin Panel Guide</span><span class="pageNumber"></span></div>',
        margin={"top": "16mm", "bottom": "16mm", "left": "18mm", "right": "18mm"},
    )
    b.close()
out_html.unlink()
print("wrote docs/admin-guide.pdf")
