import { createCommand } from '../command';
import { assertProperty } from '../utils/args';
import { readFile, writeFile } from '../utils/file';

export const changelog = createCommand(
  'changelog',
  {
    maxLength: 500,
    muchMoreText: '* and much more!',
    devImpText: '* Code optimization and improvements',
    source: './CHANGELOG.md',
    output: './changes.txt',
  },
  async ({ args, config }) => {
    assertProperty(config, 'source', 'string');
    assertProperty(config, 'output', 'string');

    const changelog = await readFile(config.source);
    const splittedChangelog = changelog.match(/# Version .+\n(?:\s|\S)*?(?=# Version|$)/g)
      .map((entry) => {
        const version = entry.match(/# Version (.+)/)[1];
        const body = entry.match(/# Version .+\n((?:\s|\S)*?)$/)[1].trim().split('\n');
        const description = body.filter(line => !!line.match(/^[^*]/)).join('\n');
        const changes = body.filter(line => !!line.match(/^\*/));
        return { version, description, changes };
      });

    const isPublic = args.public;
    const version = args.version;
    const sinceVersion = args['since-version'];
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
  }
);
