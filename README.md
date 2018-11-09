# actor-helpers

Helpers to build web applications based on the [actor model].
These helpers are used in our examples, for which you can find our boilerplate [here][boilerplate].
We encourage you to read through the boilerplate examples first and then read through the code in this repository.

## actor.ts

`actor.ts` contains a base class implementation for an actor, as well as functions to hookup and lookup actors on the web page.
For more detailed examples, please check out the in-file documentation.

## watchable-message-store.ts

This store is an implementation detail of the messaging system used to let actors interact with each other.
We suspect that end-users do not ever need to use this store directly, but feel free to use it as-is.

[actor model]: https://en.wikipedia.org/wiki/Actor_model
[boilerplate]: https://github.com/polymerlabs/actor-boilerplate