export function printInfo(message: string): void {
  console.log(`\x1b[34m[INFO]\x1b[0m ${message}`);
}

export function printSuccess(message: string): void {
  console.log(`\x1b[32m[SUCCESS]\x1b[0m ${message}`);
}

export function printWarning(message: string): void {
  console.log(`\x1b[33m[WARNING]\x1b[0m ${message}`);
}

export function printError(message: string): void {
  console.error(`\x1b[31m[ERROR]\x1b[0m ${message}`);
}
