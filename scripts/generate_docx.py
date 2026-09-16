import os
import re
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=120, bottom=120, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'<w:top w:w="{top}" w:type="dxa"/>'
        f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'<w:left w:w="{left}" w:type="dxa"/>'
        f'<w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)

def set_table_borders(table, color="D1D5DB", sz="4", val="single"):
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'<w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:left w:val="none"/>'
        f'<w:right w:val="none"/>'
        f'<w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:insideV w:val="none"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(borders)

def make_row_header(row):
    trPr = row._tr.get_or_add_trPr()
    trPr.append(parse_xml(f'<w:tblHeader {nsdecls("w")}/>'))

def make_row_cant_split(row):
    trPr = row._tr.get_or_add_trPr()
    trPr.append(parse_xml(f'<w:cantSplit {nsdecls("w")}/>'))

def build_docx(md_path, out_docx_paths):
    doc = docx.Document()

    # Standard 1-inch margins
    sections = doc.sections
    for s in sections:
        s.top_margin = Inches(1.0)
        s.bottom_margin = Inches(1.0)
        s.left_margin = Inches(1.0)
        s.right_margin = Inches(1.0)

    # Base styles
    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Segoe UI'
    normal_style.font.size = Pt(10)
    normal_style.font.color.rgb = RGBColor(0x22, 0x22, 0x22)
    normal_style.paragraph_format.line_spacing = 1.15
    normal_style.paragraph_format.space_after = Pt(6)

    # Read markdown content
    with open(md_path, 'r', encoding='utf-8') as f:
        md_text = f.read()

    # Header / Title Block
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(0)
    title_p.paragraph_format.space_after = Pt(4)
    run_title = title_p.add_run("SORTv2 System Data Dictionary")
    run_title.font.name = 'Segoe UI'
    run_title.font.size = Pt(24)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(0x00, 0x27, 0x1D) # Dark Evergreen

    sub_p = doc.add_paragraph()
    sub_p.paragraph_format.space_after = Pt(16)
    run_sub = sub_p.add_run("Smart Operations & Resource Tracking — Database Schema & Data Dictionary Specification\nDepEd / Academic Capstone Technical Documentation")
    run_sub.font.name = 'Segoe UI'
    run_sub.font.size = Pt(11)
    run_sub.font.italic = True
    run_sub.font.color.rgb = RGBColor(0x55, 0x6B, 0x64)

    # Add divider line
    div_p = doc.add_paragraph()
    div_p.paragraph_format.space_after = Pt(14)
    r_div = div_p.add_run("—" * 60)
    r_div.font.color.rgb = RGBColor(0x00, 0xA7, 0x7C) # Teal accent

    # Overview box
    intro_p = doc.add_paragraph()
    r_intro_title = intro_p.add_run("A Data Dictionary provides detailed descriptions of the data elements used in the system. ")
    r_intro_title.bold = True
    intro_p.add_run(
        "It helps software engineers, database administrators, and academic evaluators understand the logical "
        "structure, data types, constraints, and operational relationships of each database table supporting "
        "campus-wide environmental reporting, real-time gamification, SIS synchronization, and MRF inventory operations."
    )

    tech_p = doc.add_paragraph()
    tech_p.paragraph_format.space_after = Pt(18)
    r_tech = tech_p.add_run("Technical Stack & Conventions: ")
    r_tech.bold = True
    tech_p.add_run("PostgreSQL 15+  •  Prisma ORM 6  •  UUIDv4 Primary Keys (Preventing enumeration security exploits)  •  ISO 8601 UTC Timestamps  •  Enforced Foreign Keys with Cascading Rules.")

    # Parse sections from MD
    # We will split by ## or ### Table
    table_blocks = re.split(r'\n(?=##+ Table \d+)', md_text)
    
    # Check if first block has conventions or table
    for block in table_blocks:
        block = block.strip()
        if not block:
            continue
        
        # Match Table Header: e.g. ## Table 5: User (`users`)
        header_match = re.match(r'##+ Table (\d+):\s*([^\n`]+)(?:`([^`]+)`)?', block)
        if header_match:
            t_num = header_match.group(1)
            t_name = header_match.group(2).strip(" :()")
            t_raw = header_match.group(3) or t_name.lower()

            # Add Table Heading
            h = doc.add_paragraph()
            h.paragraph_format.space_before = Pt(18)
            h.paragraph_format.space_after = Pt(4)
            h.paragraph_format.keep_with_next = True
            
            run_h = h.add_run(f"Table {t_num}\n{t_name}")
            run_h.font.name = 'Segoe UI'
            run_h.font.size = Pt(14)
            run_h.font.bold = True
            run_h.font.color.rgb = RGBColor(0x00, 0x27, 0x1D)

            if t_raw:
                run_tag = h.add_run(f"  [Table: {t_raw}]")
                run_tag.font.size = Pt(10)
                run_tag.font.bold = False
                run_tag.font.color.rgb = RGBColor(0x00, 0xA7, 0x7C)

            # Look for introductory description before table
            lines = block.split('\n')
            desc_lines = []
            table_lines = []
            footer_lines = []
            state = "DESC" # DESC -> TABLE -> FOOTER

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

            # Print description paragraph if any
            if desc_lines:
                desc_p = doc.add_paragraph()
                desc_p.paragraph_format.space_after = Pt(6)
                desc_p.paragraph_format.keep_with_next = True
                desc_run = desc_p.add_run(" ".join(desc_lines))
                desc_run.font.size = Pt(10)
                desc_run.font.color.rgb = RGBColor(0x44, 0x44, 0x44)

            # Process Markdown Table
            if table_lines:
                # Parse markdown rows
                parsed_rows = []
                for tline in table_lines:
                    # Skip delimiter row e.g. | :--- | :--- |
                    if re.match(r'\|\s*:?-+:?\s*\|', tline):
                        continue
                    cols = [c.strip() for c in tline.strip('|').split('|')]
                    parsed_rows.append(cols)

                if parsed_rows:
                    num_cols = max(len(r) for r in parsed_rows)
                    tbl = doc.add_table(rows=len(parsed_rows), cols=num_cols)
                    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
                    set_table_borders(tbl, color="D1D5DB", sz="4", val="single")

                    # Column widths approx (total ~6.5 inches)
                    col_widths = [Inches(1.4), Inches(1.1), Inches(1.5), Inches(2.5)]
                    if num_cols != 4:
                        w_each = Inches(6.5 / num_cols)
                        col_widths = [w_each] * num_cols

                    for r_idx, row_data in enumerate(parsed_rows):
                        row_elem = tbl.rows[r_idx]
                        make_row_cant_split(row_elem)
                        is_header = (r_idx == 0)
                        if is_header:
                            make_row_header(row_elem)

                        for c_idx in range(num_cols):
                            cell = row_elem.cells[c_idx]
                            cell.width = col_widths[c_idx] if c_idx < len(col_widths) else Inches(1.5)
                            cell_val = row_data[c_idx] if c_idx < len(row_data) else ""
                            cell_val = cell_val.replace('`', '') # remove markdown backticks

                            set_cell_margins(cell, top=80, bottom=80, left=110, right=110)

                            if is_header:
                                set_cell_background(cell, "00271D") # Deep evergreen
                            else:
                                if r_idx % 2 == 1:
                                    set_cell_background(cell, "FAFAFA") # Subtle stripe
                                else:
                                    set_cell_background(cell, "FFFFFF")

                            cell.text = ""
                            p = cell.paragraphs[0]
                            p.paragraph_format.space_before = Pt(2)
                            p.paragraph_format.space_after = Pt(2)
                            p.paragraph_format.line_spacing = 1.05

                            run = p.add_run(cell_val)
                            run.font.name = 'Segoe UI'
                            if is_header:
                                run.font.bold = True
                                run.font.size = Pt(9.5)
                                run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
                            else:
                                run.font.size = Pt(9.0)
                                if c_idx == 0:
                                    run.font.bold = True
                                    run.font.color.rgb = RGBColor(0x00, 0x27, 0x1D)
                                elif c_idx == 1:
                                    run.font.color.rgb = RGBColor(0x00, 0x7A, 0x5C)
                                else:
                                    run.font.color.rgb = RGBColor(0x33, 0x33, 0x33)

            # Print narrative footer / summary
            if footer_lines:
                foot_p = doc.add_paragraph()
                foot_p.paragraph_format.space_before = Pt(6)
                foot_p.paragraph_format.space_after = Pt(14)
                f_text = " ".join(footer_lines).replace('*', '')
                foot_run = foot_p.add_run(f_text)
                foot_run.font.size = Pt(9.5)
                foot_run.font.italic = True
                foot_run.font.color.rgb = RGBColor(0x55, 0x55, 0x55)

    # Save to all requested paths
    for p in out_docx_paths:
        os.makedirs(os.path.dirname(os.path.abspath(p)), exist_ok=True)
        doc.save(p)
        print(f"Successfully generated DOCX at: {p}")

if __name__ == '__main__':
    md_file = r"c:\Users\NACION\OneDrive\Desktop\Sortv2\server\docs\DATA_DICTIONARY.md"
    out_files = [
        r"c:\Users\NACION\OneDrive\Desktop\Sortv2\server\docs\SORTv2_Data_Dictionary.docx",
        r"c:\Users\NACION\OneDrive\Desktop\Sortv2\SORTv2_Data_Dictionary.docx"
    ]
    build_docx(md_file, out_files)
