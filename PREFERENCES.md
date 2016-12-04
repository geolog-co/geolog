# Preferences

## Meta preference

- Prefer specifying a positive action to take rather than just something to avoid
- Prefer to explain the reasons for a preference rather than just the statement. Reasons: so you can judge if in a given situation you should abide by the preference or not. Also, if can't come up with a reason, maybe it shouldn't be a preference.
- Prefer to treat just each situation on a case-by-case basis rather than making unbreakable rules. Reason: the author of these preferences has not seen your exact situation!
- Prefer to change these if evidence suggests they're not great rather than following them just because they are a preference.

## Code

- Prefer arguments passed to functions over using using state
- Prefer having a few more variables rather than changing existing ones
- Prefer rearchitecting a bit for now/fewer variables to be changed rather than adding a variable that gets changed
- Prefer having a little bit of smell rather than overengineering for one or two cases
- Prefer to refactor when realising the smell is too strong, rather than later
- Prefer to judge all code as though it were written for the current uses, rather than giving weight to historical uses
- Prefer to have one source of truth over multiple copies of it, even if it takes a little bit of time to fetch it.
- Prefer to have lower cyclomatic complexity rather than slightly more efficient code
- Prefer to have a less code in branches rather than more
- Prefer to set a variable in branch rather than code that does something
- Prefer to have one way of doing something rather than two. Example: getting config into code.
- Prefer to explicitly set parameters in all cases rather overriding a default.
- Prefer to rename variables rather than leaving unclear or inconsistent names live on in the code base.
- Prefer to pass a few more variables around rather than saving state. E.g. in root for this, could have a `mapsLoaded` variable that is changed when the Google Maps API is loaded. However, no need for this, can just have the 2 callbacks, render(false) and render(true), and re-render the root element as needed.

## UI

- Prefer to use write own high level UI widgets over third party (specific case of fewer dependencies) Reason: from experience the gain of a quick win to get started is quickly outweighed by being forced into a code structure and behaviour, and UI that is not desirable for your use case. Most starting behaviour is simple, so no need for the availability for the all-singing-all-dancing widget to begin with. Especially as the singing and dancing is unlikely to be what is needed later on.

## Testing

- Prefer to apply same preferences as to rest of code rather than special casing testing code
- Prefer testing public behaviour over private implementation details
- Prefer to keep in mind that a reason for unit tests are to free you to make changes in the future, rather than to test current behaviour
- Prefer to write code in a way that can be unit tested, even if we don't actually unit test it now.
- Prefer quick tests over long running ones

## Build scripts

- Prefer to apply same preferences as to rest of code rather than special casing the build scripts

## Deployment

- Prefer time to failure to be quick rather than long
- Prefer failure to be safe

## Infrastructure

- Prefer to automate creation/descruction of it rather than manual changes using a UI
- Prefer to have all infrastructure in source code rather than, er, nowhere but the infrastructure itself
- Prefer to be able to test changes to infrastructure before it is live rather than after (tricky and I have never acheived this!)
- Prefer to have less stateful infratructure over more
- Prefer to have shorter-lived state over longer-lived state
- Prefer to let someone else maintain anything stateful (i.e. the servers) over maintaining them myself.

## Dependencies

- Prefer to write own code over using a dependency.
- Prefer to write own code over hacking around a dependency's limitations.

## Security

- Prefer to keep permissions as restrictive as possible rather than as permissive as possible. Not just security: clarity

## Development

- Prefer to have a close as possible copy of the production system in development (tricky with a serverless setup, but working on it...)
