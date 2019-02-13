import {Realm} from '../realm/Realm.js';

export interface Bridge {
  install(realm: Realm): void;
}
