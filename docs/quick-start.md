
# Native Butler
Set of scripts that speed up development of React Native apps.

### Motivation
In all of our React Native projects, we have to perform a set of tasks that happen over and over. Life's too short to do it manually, hence the layer of automation that does that for us.

### Features

* Github PR comment support
* Travis and CircleCI environment support
* Standard set of actions which compile into a report
* Humble emoji set to decorate messages (this one should be #1 feature)

### Setup

You'll obviously need Node.js and NPM or Yarn. Add a package as follows:

```bash
npm install @h1/native-butler --save-dev
# or
yarn install @h1/native-butler -D
```

Then add `.butler.json` configuration file and define some actions inside:

```json
{
  
}
```


Next, add Native Butler to `package.json` scripts for simplicity, i.e.:
```json
{
  "scripts": {
    "butler": "native-butler"
  }
}
```

And run it's functions, just like that:
```bash
npm run butler version:reflect
# or
yarn butler version:reflect
```

## Changelog

See [Changelog](../CHANGELOG.md).
