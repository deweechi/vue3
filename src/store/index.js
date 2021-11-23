import { createStore } from "vuex";
import { findById, upsert } from "@/helpers";
import { getFirestore, getDoc, doc, onSnapshot, collection } from "firebase/firestore";

export default createStore({
  state: {
    categories: [],
    forums: [],
    threads: [],
    posts: [],
    users: [],
    authId: "VXjpr2WHa8Ux4Bnggym8QFLdv5C3",
  },
  getters: {
    authUser: (state, getters) => {
      return getters.user(state.authId);
    },
    user: (state) => {
      return (id) => {
        const user = findById(state.users, id);
        if (!user) return null;

        return {
          ...user,
          get postsCount() {
            return this.posts.length;
          },
          get posts() {
            return state.posts.filter((post) => post.userId === user.id);
          },
          get threadsCount() {
            return this.threads.length;
          },
          get threads() {
            return state.threads.filter((thread) => thread.userId === user.id);
          },
        };
      };
    },

    thread: (state) => {
      return (id) => {
        const thread = findById(state.threads, id);
        if (!thread) return {}
        return {
          ...thread,
          get author() {
            return findById(state.users, thread.userId);
          },
          get repliesCount() {
            return thread.posts.length - 1;
          },
          get contributorsCount() {
            return thread.contributors?.length || 0;
          },
        };
      };
    },
  },
  actions: {
    createPost({ commit, state }, post) {
      post.id = "ggqq" + Math.random();
      post.userId = state.authId;
      post.publishedAt = Math.floor(Date.now() / 1000);
      commit("setItem", {dataCollection:'posts', item:post });
      commit("appendPostToThread", { childId: post.id, parentId: post.threadId });

      commit("appendContributorToThread", { childId: state.authId, parentId: post.threadId });
    },
    async createThread({ commit, state, dispatch }, { text, title, forumId }) {
      const id = "ggqq" + Math.random();
      const userId = state.authId;
      const publishedAt = Math.floor(Date.now() / 1000);
      const thread = { forumId, title, publishedAt, userId, id };
      commit("setItem", {dataCollection:"threads", item:thread });
      commit("appendThreadToUser", { parentId: userId, childId: id });
      commit("appendThreadToForum", { parentId: forumId, childId: id });
      dispatch("createPost", { text, threadId: id });
      return findById(state.threads, id);
    },
    async updateThread({ commit, state }, { title, text, id }) {
      const thread = findById(state.threads, id)
      const post = findById(state.posts, thread.posts[0])
      const newThread = { ...thread, title }
      const newPost = { ...post, text }
      commit("setItem", { dataCollection: 'threads', item: newThread });      
      commit("setItem", { dataCollection: 'posts', item: newPost })
      return newThread;
    },
    updateUser({ commit }, user) {
      commit("setItem", {dataCollection: 'users', item:user})
    },
    fetchCategories({ dispatch }, { id }) {
      return dispatch('fetchItems', { dataCollection: 'categories', id})
    },
    fetchAllCategories ({commit}) {
      return new Promise((resolve) => {
        const db = getFirestore();
        onSnapshot(collection(db, 'categories'), (doc)=>
        {
        const categories = doc.docs.map(doc => {
          const item =  {id: doc.id, ...doc.data()}
          commit('setItem', {dataCollection:'categories', item})
          return item
        })  
        resolve(categories);
      });
   });
    },
    fetchThread({ dispatch }, { id }) {
      return dispatch('fetchItem', { dataCollection: 'threads', id})
    },
    fetchThreads({ dispatch }, { ids }) {
      return dispatch('fetchItems', { dataCollection: 'threads', ids})
    },
    fetchForum({ dispatch }, { id }) {
      return dispatch('fetchItem', { dataCollection: 'forums', id})
    },
    fetchForums({ dispatch }, { ids }) {
      return dispatch('fetchItems', { dataCollection: 'forums', ids})
    },
    fetchUser({ dispatch }, { id }) {
      return dispatch('fetchItem', { dataCollection: 'users', id})
    },
    fetchUsers({ dispatch }, { ids }) {
      return dispatch('fetchItems', { dataCollection: 'users', ids})
    },
    fetchPost({ dispatch }, { id }) {
      return dispatch('fetchItem', { dataCollection: 'posts', id})
     },
    fetchPosts({dispatch}, {ids} ) {
      return dispatch('fetchItems', {dataCollection:'posts',ids})
    },
    fetchItem({ state, commit }, { id, dataCollection }) {
      return new Promise((resolve) => {
        const db = getFirestore();
        const postRef = doc(db, dataCollection, id);
        getDoc(postRef).then((snapshot) => {
          const item = { ...snapshot.data(), id: snapshot.id };
          commit("setItem", { dataCollection, id, item });
          resolve(item);
        });
      });
    },
    fetchItems({dispatch}, {ids, dataCollection}){
      return Promise.all(ids.map(id=> dispatch('fetchItem', {id, dataCollection})))
    },
  },
  mutations: {
    setItem(state, {dataCollection, item}) {
      upsert(state[dataCollection], item)
    },    
    
    appendPostToThread: makeAppendChildToParentMutation({ parent: "threads", child: "posts" }),
    appendThreadToForum: makeAppendChildToParentMutation({ parent: "forums", child: "threads" }),
    appendThreadToUser: makeAppendChildToParentMutation({ parent: "users", child: "threads" }),
    appendContributorToThread: makeAppendChildToParentMutation({
      parent: "threads",
      child: "contributors",
    }),
  },
});

function makeAppendChildToParentMutation({ parent, child }) {
  return (state, { childId, parentId }) => {
    const resource = findById(state[parent], parentId);
    resource[child] = resource[child] || [];

    if (!resource[child].includes(childId)) {
      resource[child].push(childId);
    }
  };
}
