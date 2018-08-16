import { CommandBuilder } from '../command';
import { readFile, writeFile } from '../utils/file';

const TAG = 'changelog';

interface Config {
  maxLength: number;
  muchMoreText: string;
  devImpText: string;
  source: string;
  output: string;
}

interface Args {
  entry: string;
  public: string;
  version: string;
  since: string;
}

export const changelog = new CommandBuilder<Config, Args>()
  .name(TAG)
  .defaultConfig({
    maxLength: 500,
    muchMoreText: '* and much more!',
    devImpText: '* Code optimization and improvements',
    source: './CHANGELOG.md',
    output: './changes.txt',
  })
  .args({
    entry: {
      type: 'string',
      description: 'The other way to specify version, ' +
        'this is the entry number since the latest changelog entry, ' +
        'i.e. for current version specify 0 and for changelog from 2 versions ago - 2',
    },
    public: {
      type: 'flag',
      description: 'Defines whether the changelog is public - ' +
        'all [DEV] entries will be removed and the result will be trimmed to maxLength defined in config',
    },
    version: {
      type: 'string',
      description: 'The current version, for which the changelog will be collected; ' +
        'to specify the range use "since" argument.',
    },
    since: { type: 'string', description: 'The version since which the changelog will be collected' },
  })
  .config({
    maxLength: { type: 'number', description: 'Max allowed changelog\'s length in characters.' },
    devImpText: { type: 'string', description: 'A stub to replace all [DEV]-tagged changelog entries when ' },
    muchMoreText: {
      type: 'string',
      description: 'A stub to replace meaningful (non-[DEV]-tagged) changelog entries ' +
        'when the character limit is exceeded',
    },
    source: { type: 'string', description: 'A path to input changelog file.' },
    output: { type: 'string', description: 'A path to output, formatted changelog file.' },
  })
  .execute(async ({ args, config }) => {
    const changelog = await readFile(config.source);
    const splittedChangelog = changelog.match(/# Version .+\n(?:\s|\S)*?(?=# Version|$)/g)
      .map((entry) => {
        const version = entry.match(/# Version (.+)/)[1];
        const body = entry.match(/# Version .+\n((?:\s|\S)*?)$/)[1].trim().split('\n');
        const description = body.filter(line => !!line.match(/^[^*]/)).join('\n');
        const changes = body.filter(line => !!line.match(/^\*/));
        return { version, description, changes };
      });

    const { public: isPublic, version, since: sinceVersion } = args;

    const entry = (
      version
        ? splittedChangelog.findIndex(entry => entry.version === version)
        : parseInt(args.entry || '0', 10)
    );
    const since = (sinceVersion
        ? splittedChangelog.findIndex(entry => entry.version === sinceVersion)
        : parseInt(args.since || '0', 10)
    ) + 1;

    const changelogEntries = splittedChangelog.slice(entry, since)
      .reduce((total, currentEntry) => {
        total.push(...currentEntry.changes);
        return total;
      }, []);

    let changes = [];

    // Produce a simplified changelog that can be shown to public
    if (isPublic) {
      if (changelogEntries.find(line => !!line.match(/\[DEV]/))) {
        changes.push(config.devImpText);
      }
      const tags = /\[(NEW|FIX|IMP)]/;
      changes.unshift(...changelogEntries
        .filter(line => !!line.match(tags))
        .map(line => line.replace(tags, '').replace(/ {2}/g, ' '))
      );
    } else {
      changes = changelogEntries;
    }

    const stringifyChanges = (changes: string[], tryCount = 1) => {
      const str = changes
        .map(line => line.replace(/^\*/, '•').trim())
        .join('\n')
        .trim();
      if (isPublic && str.length > config.maxLength) {
        const shorterChanges = [...changes];
        shorterChanges.splice(changes.length - tryCount, tryCount, config.muchMoreText);
        return stringifyChanges(shorterChanges, tryCount + 1);
      }
      return str;
    };

    console.log(stringifyChanges(changes));
    await writeFile(config.output, stringifyChanges(changes));
  })
  .build();
