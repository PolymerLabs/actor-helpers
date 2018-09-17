import {MasterStateMessenger} from '../../state-messenger/StateMessenger.js';

const state = {
  foo: '',
  bar: {baz: 5}
};
const newState = {
  foo: 'Updated',
  bar: {baz: 6}
};

const master = MasterStateMessenger.create('channel', state);

onmessage = () => {
  master.setState(newState);
};
