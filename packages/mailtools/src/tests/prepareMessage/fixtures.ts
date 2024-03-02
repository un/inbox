import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, basename } from 'path';

const FIXTURE_DIR = join(import.meta.dirname, 'fixtures');

class Fixture {
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  get inputPath(): string {
    return join(FIXTURE_DIR, this.name + '.input.html');
  }
  get outputMessagePath(): string {
    return join(FIXTURE_DIR, this.name + '.output-message.html');
  }
  get outputCompletePath(): string {
    return join(FIXTURE_DIR, this.name + '.output-complete.html');
  }

  get input(): string {
    return readFileSync(this.inputPath).toString();
  }
  get outputMessage(): string {
    return readFileSync(this.outputMessagePath).toString();
  }
  get outputComplete(): string {
    return readFileSync(this.outputCompletePath).toString();
  }

  hasInput(): boolean {
    return existsSync(this.inputPath);
  }
  hasOutputMessage(): boolean {
    return existsSync(this.outputMessagePath);
  }
  hasOutputComplete(): boolean {
    return existsSync(this.outputCompletePath);
  }
}

function listFixtures(): Fixture[] {
  const files: string[] = readdirSync(FIXTURE_DIR);

  const inputs = files.filter((path) => {
    return path.endsWith('.input.html');
  });

  const fixtures = inputs
    .map((path) => basename(path, '.input.html'))
    .map((name) => new Fixture(name));

  return fixtures;
}

export { Fixture, listFixtures };
