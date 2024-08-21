import fs from 'fs';

class Logger {
  private logStream: fs.WriteStream | null = null;
  private originalConsoleLog: typeof console.log;
  private originalConsoleInfo: typeof console.info;
  private originalConsoleError: typeof console.error;

  constructor(private logFile: string | null = null) {
    // disable no-console
    /* eslint-disable no-console */
    this.originalConsoleLog = console.log;
    this.originalConsoleInfo = console.info;
    this.originalConsoleError = console.error;
  }

  init(logFile: string | null = null) {
    if (logFile) {
      this.logFile = logFile;
    }
    if (this.logFile) {
      this.logStream = fs.createWriteStream(this.logFile, { flags: 'a' });
    }
    console.log = console.info = console.error = this.log.bind(this);
  }

  log(message: string) {
    const timestamp = new Date().toLocaleString();
    const logMessage = `[${timestamp}] ${message}`;
    this.originalConsoleLog(logMessage);
    if (this.logStream) {
      this.logStream.write(logMessage + '\n');
    }
  }

  restore() {
    console.log = this.originalConsoleLog;
    console.info = this.originalConsoleInfo;
    console.error = this.originalConsoleError;
    if (this.logStream) {
      this.logStream.end();
    }
  }
}

export const logger = new Logger();
