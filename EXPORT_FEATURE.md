# PDF Export Feature for Agent Flow Viewer

## Overview
The Agent Flow Viewer now includes PDF export functionality that allows users to export the currently viewed agent flow steps to a professionally formatted PDF document.

## Features

### ✨ Key Capabilities
- **Complete Export**: Exports all currently filtered/visible steps
- **High Quality**: Uses 2x scale rendering for crisp output  
- **Multi-page Support**: Automatically handles content that spans multiple pages
- **Cover Page**: Includes summary information and statistics
- **Preserves Formatting**: Maintains colors, icons, and visual styling from the web view
- **Timestamped Files**: Automatic filename generation with timestamps

### 📄 PDF Structure
1. **Cover Page**: 
   - Request metadata (ID, user, timestamps)
   - Summary statistics (step counts, agents, tools, errors)
   - Generation timestamp

2. **Content Pages**:
   - Each step rendered as it appears in the web interface
   - Proper page breaks and margins
   - Maintains visual hierarchy and styling

## Usage

### Basic Export
1. Navigate to the Agent Flow Viewer
2. Select a request from the list
3. Apply any desired filters (step types, agents, etc.)
4. Click the **"Export PDF"** button in the header
5. The PDF will be automatically downloaded

### Export Button States
- **Normal**: Shows "Export PDF" with download icon
- **Exporting**: Shows "Exporting..." with loading spinner
- **Disabled**: When no steps are visible or selected

### Error Handling
- Export errors are displayed below the button
- Console logging provides detailed error information
- Graceful fallback for unsupported browsers

## Technical Details

### Dependencies Added
```json
{
  "html2canvas-pro": "^1.5.11",
  "jspdf": "^2.5.2"
}
```

### Components Created
- `hooks/usePDFExport.ts` - Core export logic
- `components/ExportButton.tsx` - Export UI component
- Enhanced `AgentFlowViewer.tsx` - Integrated export functionality

### Export Configuration
- **Format**: A4 Portrait
- **Quality**: 95% JPEG compression
- **Scale**: 2x for high-resolution output
- **Margins**: 15mm on all sides

## Browser Compatibility
- Modern browsers with Canvas and Blob support
- Chrome, Firefox, Safari, Edge (recent versions)
- Mobile browsers supported

## Known Issues & Fixes
- **OKLCH Color Function Error**: ✅ **RESOLVED** - Replaced `html2canvas` with `html2canvas-pro` which natively supports modern CSS color functions including `oklch()`, `oklab()`, `color()`, `lab()`, and `lch()` used in Tailwind CSS v4.

## Performance Considerations
- Export time scales with content complexity
- Large flows may take 10-30 seconds to process
- Memory usage increases with step count
- Progress feedback provided during export

## File Naming
Exported PDFs use the format:
```
agent-flow-export-YYYY-MM-DDTHH-MM-SS.pdf
```

## Customization Options
The export functionality can be customized by modifying:
- `usePDFExport.ts` - Export logic and PDF formatting
- `ExportButton.tsx` - Button appearance and behavior
- Cover page content and styling in the hook

## Future Enhancements
- [ ] Custom filename input
- [ ] Export format selection (PDF/PNG)
- [ ] Selective step export (checkboxes)
- [ ] Batch export multiple requests
- [ ] Print preview before export