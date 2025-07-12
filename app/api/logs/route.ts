import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');
    
    // Define the logs directory path
    const logsDir = path.join(process.cwd(), 'logs');
    
    // If no filename specified, list available log files
    if (!filename) {
      try {
        const files = await fs.readdir(logsDir);
        const logFiles = files.filter(file => file.endsWith('.log'));
        return NextResponse.json({ files: logFiles });
      } catch {
        return NextResponse.json({ error: 'Logs directory not found', files: [] });
      }
    }
    
    // Validate filename to prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }
    
    // Read the specific log file
    const filePath = path.join(logsDir, filename);
    
    try {
      const fileContent = await fs.readFile(filePath, 'utf8');
      return NextResponse.json({ 
        content: fileContent, 
        filename: filename 
      });
    } catch {
      return NextResponse.json({ 
        error: `File not found: ${filename}` 
      }, { status: 404 });
    }
    
  } catch (error) {
    console.error('Error in logs API:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}