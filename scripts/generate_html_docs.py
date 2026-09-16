import os
import re

def markdown_to_html(md_path, html_path):
    with open(md_path, 'r', encoding='utf-8') as f:
        content = f.read()

    html_parts = []
    
    html_header = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SORTv2 Database Data Dictionary</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #00271D;
      --accent: #00A77C;
      --bg: #F9F3F0;
      --card-bg: #FFFFFF;
      --text: #00271D;
      --text-muted: #526661;
      --border: #E2E8F0;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 40px 20px;
    }
    .container {
      max-width: 1040px;
      margin: 0 auto;
    }
    .header-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 36px;
      margin-bottom: 32px;
      box-shadow: 0 4px 20px -2px rgba(0, 39, 29, 0.05);
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      background: #E6F6F2;
      color: var(--accent);
      margin-bottom: 12px;
    }
    h1 {
      font-size: 32px;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 8px;
    }
    .subtitle {
      font-size: 15px;
      color: var(--text-muted);
      margin-bottom: 20px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid var(--border);
      font-size: 13px;
    }
    .info-item strong {
      display: block;
      color: var(--primary);
      margin-bottom: 2px;
    }
    .table-section {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 28px;
      margin-bottom: 28px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
      page-break-inside: avoid;
    }
    .table-title {
      font-size: 19px;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .table-tag {
      font-size: 12px;
      font-weight: 600;
      font-family: 'JetBrains Mono', monospace;
      color: var(--accent);
      background: #E6F6F2;
      padding: 2px 8px;
      border-radius: 6px;
    }
    .table-desc {
      font-size: 14px;
      color: var(--text-muted);
      margin-bottom: 18px;
    }
    .table-wrapper {
      overflow-x: auto;
      border: 1px solid var(--border);
      border-radius: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13px;
    }
    th {
      background: #FAF8F5;
      color: var(--primary);
      font-weight: 600;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.5px;
    }
    td {
      padding: 12px 16px;
      border-bottom: 1px solid #F1F5F9;
      color: #334155;
    }
    tr:last-child td {
      border-bottom: none;
    }
    tr:hover td {
      background: #F8FAFC;
    }
    .field-name {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;
      color: var(--primary);
    }
    .type-badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11.5px;
      color: #0E7490;
      background: #ECFEFF;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .table-note {
      margin-top: 14px;
      font-size: 13px;
      font-style: italic;
      color: var(--text-muted);
    }
    .actions-bar {
      margin-bottom: 24px;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
    .btn {
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: none;
    }
    .btn-primary {
      background: var(--accent);
      color: white;
    }
    .btn-secondary {
      background: #FFFFFF;
      color: var(--primary);
      border: 1px solid var(--border);
    }
    @media print {
      body { background: #FFFFFF; padding: 0; }
      .actions-bar { display: none; }
      .header-card, .table-section { border: none; box-shadow: none; padding: 12px 0; margin-bottom: 20px; }
      th { background: #F1F5F9 !important; -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="actions-bar">
      <button onclick="window.print()" class="btn btn-primary">🖨️ Print / Save as PDF</button>
    </div>
    
    <header class="header-card">
      <span class="badge">Official Technical Specification</span>
      <h1>SORTv2 Database Data Dictionary</h1>
      <p class="subtitle">Smart Operations & Resource Tracking System — Relational Schema & Table Documentation for Capstone / Thesis</p>
      
      <div class="info-grid">
        <div class="info-item">
          <strong>Database Engine</strong>
          PostgreSQL 15+
        </div>
        <div class="info-item">
          <strong>ORM Framework</strong>
          Prisma ORM 6.4
        </div>
        <div class="info-item">
          <strong>Primary Keys</strong>
          UUIDv4 (36 chars)
        </div>
        <div class="info-item">
          <strong>Timestamp Standard</strong>
          ISO 8601 (UTC)
        </div>
      </div>
    </header>
"""
    html_parts.append(html_header)

    # Parse sections
    blocks = re.split(r'\n(?=##+ Table \d+)', content)
    for block in blocks:
        block = block.strip()
        if not block:
            continue
        
        header_match = re.match(r'##+ Table (\d+):\s*([^\n`]+)(?:`([^`]+)`)?', block)
        if header_match:
            t_num = header_match.group(1)
            t_name = header_match.group(2).strip(" :()")
            t_raw = header_match.group(3) or t_name.lower()

            lines = block.split('\n')
            desc_lines = []
            table_lines = []
            footer_lines = []
            state = "DESC"

            for line in lines[1:]:
                line_str = line.strip()
                if line_str.startswith('|') and '|' in line_str[1:]:
                    state = "TABLE"
                    table_lines.append(line_str)
                elif state == "TABLE" and not line_str.startswith('|'):
                    if line_str:
                        state = "FOOTER"
                        footer_lines.append(line_str)
                elif state == "DESC":
                    if line_str:
                        desc_lines.append(line_str)
                elif state == "FOOTER":
                    if line_str:
                        footer_lines.append(line_str)

            html_parts.append('<section class="table-section">')
            html_parts.append(f'<div class="table-title">Table {t_num}: {t_name} <span class="table-tag">{t_raw}</span></div>')
            
            if desc_lines:
                html_parts.append(f'<p class="table-desc">{" ".join(desc_lines)}</p>')

            if table_lines:
                html_parts.append('<div class="table-wrapper"><table>')
                # Parse markdown rows
                is_first = True
                for tline in table_lines:
                    if re.match(r'\|\s*:?-+:?\s*\|', tline):
                        continue
                    cols = [c.strip() for c in tline.strip('|').split('|')]
                    if is_first:
                        html_parts.append('<thead><tr>')
                        for c in cols:
                            html_parts.append(f'<th>{c.replace("`", "")}</th>')
                        html_parts.append('</tr></thead><tbody>')
                        is_first = False
                    else:
                        html_parts.append('<tr>')
                        for idx, c in enumerate(cols):
                            val = c.replace('`', '')
                            if idx == 0:
                                html_parts.append(f'<td class="field-name">{val}</td>')
                            elif idx == 1:
                                html_parts.append(f'<td><span class="type-badge">{val}</span></td>')
                            else:
                                html_parts.append(f'<td>{val}</td>')
                        html_parts.append('</tr>')
                html_parts.append('</tbody></table></div>')

            if footer_lines:
                f_text = " ".join(footer_lines).replace('*', '')
                html_parts.append(f'<p class="table-note">{f_text}</p>')

            html_parts.append('</section>')

    html_parts.append("""
  </div>
</body>
</html>
""")

    with open(html_path, 'w', encoding='utf-8') as f:
        f.write("\n".join(html_parts))
    print(f"Successfully generated HTML documentation at: {html_path}")

if __name__ == '__main__':
    md_file = r"c:\Users\NACION\OneDrive\Desktop\Sortv2\server\docs\DATA_DICTIONARY.md"
    out_html = r"c:\Users\NACION\OneDrive\Desktop\Sortv2\SORTv2_Data_Dictionary.html"
    markdown_to_html(md_file, out_html)
