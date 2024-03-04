import { formatHtml } from '../utils';
import { parseMessage } from '../../parseMessage';
import { listFixtures, Fixture } from './fixtures';
import testOptions from './prepareMessageTestOptions';

/**
 * Run tests for a fixture
 */
function checkFixture(fixture: Fixture) {
  describe(fixture.name, async () => {
    const result = await parseMessage(fixture.input, testOptions);

    if (fixture.hasOutputComplete()) {
      it('completeHtml', async () => {
        expect(await formatHtml(result.completeHtml)).toBe(
          await formatHtml(fixture.outputComplete)
        );
      });
    }

    if (fixture.hasOutputMessage()) {
      // console.log(result.messageHtml);
      it('messageHtml', async () => {
        expect(await formatHtml(result.parsedMessageHtml)).toBe(
          await formatHtml(fixture.outputMessage)
        );
      });
    }
  });
}

describe('prepareMessage', () => {
  const fixtures = listFixtures().filter(
    (fixture) => fixture.hasOutputComplete() || fixture.hasOutputMessage()
  );

  fixtures.forEach(checkFixture);
});
