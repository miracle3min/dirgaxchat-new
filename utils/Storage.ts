import localforage from 'localforage'

const store = localforage.createInstance({
  name: 'TWG',
  storeName: 'twgStore',
  description: 'Used to store data for the dirgax-chat project',
})

export default store
