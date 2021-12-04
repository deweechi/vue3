import { findById, docToResource } from "@/helpers";
import {
  getFirestore,
  getDoc,
  doc,
  onSnapshot,
  collection,
  arrayUnion,
  writeBatch,
  serverTimestamp,
  increment
} from "firebase/firestore";
export default {
  async createPost({ commit, state }, post) {
    const db = getFirestore()

    post.userId = state.authId
    post.publishedAt = serverTimestamp()
    const batch = writeBatch(db)
    const newPostRef = doc(collection(db, "posts"))
    const threadRef = doc(db, "threads", post.threadId)
    const userRef = doc(db, "users", state.authId )
    batch.set(newPostRef, post)
    batch.update(userRef,
      {
        postsCount:increment(1)
      })
    batch.update(threadRef, {
      posts: arrayUnion(newPostRef.id),
      contributors: arrayUnion(state.authId),
    });
    await batch.commit();
    const postRef = await getDoc(newPostRef)
    
    commit("setItem", { dataCollection: "posts", item: { ...postRef.data(), id: postRef.id } });
    commit("appendPostToThread", { childId: postRef.id, parentId: post.threadId });
    
    commit("appendContributorToThread", { childId: state.authId, parentId: post.threadId });
  },
  async createThread({ commit, state, dispatch }, { text, title, forumId }) {
    const db = getFirestore()
    const batch = writeBatch(db)
    const userId = state.authId;
    const publishedAt = serverTimestamp()
    const newThreadRef = doc(collection(db, "threads"))
    const thread = { forumId, title, publishedAt, userId, id: newThreadRef.id };
     
    const userRef = doc(db, "users", userId)
    const forumRef = doc(db, "forums", forumId)

    batch.set(newThreadRef, thread)
    batch.update(userRef, {
      threads: arrayUnion(newThreadRef.id),
     });
     batch.update(forumRef, {
      threads: arrayUnion(newThreadRef.id),
     });
    await batch.commit();
    const threadRef = await getDoc(newThreadRef)

    commit("setItem", { dataCollection: "threads", item: {...threadRef.data(), id:threadRef.id }});
    commit("appendThreadToUser", { parentId: userId, childId: newThreadRef.id });
    commit("appendThreadToForum", { parentId: forumId, childId: newThreadRef.id });
    await dispatch("createPost", { text, threadId: newThreadRef.id });
    return findById(state.threads, newThreadRef.id);
  },
  async updateThread({ commit, state }, { title, text, id }) {
    const thread = findById(state.threads, id);
    const post = findById(state.posts, thread.posts[0]);
    let newThread = { ...thread, title };
    let newPost = { ...post, text };
    const db = getFirestore()
    const threadRef = doc(db, "threads", id)
    const postRef = doc(db, "posts", post.id)
    const batch = writeBatch(db)
    batch.update(threadRef, newThread);
    batch.update(postRef, newPost);
    await batch.commit();
    newThread = await getDoc(threadRef)
    
    newPost = await getDoc(postRef)
    
    commit("setItem", { dataCollection: "threads", item: newThread });
    commit("setItem", { dataCollection: "posts", item: newPost });
    return docToResource(newThread);
  },
  updateUser({ commit }, user) {
    commit("setItem", { dataCollection: "users", item: user });
  },
  fetchCategory: ({ dispatch }, { id }) => dispatch('fetchItem', { dataCollection: 'categories', id }),
  fetchCategories({ dispatch }, { id }) {
    return dispatch("fetchItems", { dataCollection: "categories", id });
  },
  fetchAllCategories({ commit }) {
    return new Promise((resolve) => {
      const db = getFirestore();
      onSnapshot(collection(db, "categories"), (doc) => {
        const categories = doc.docs.map((doc) => {
          const item = { id: doc.id, ...doc.data() };
          commit("setItem", { dataCollection: "categories", item });
          return item;
        });
        resolve(categories);
      });
    });
  },
  fetchThread: ({ dispatch }, { id }) => dispatch("fetchItem", { dataCollection: "threads", id }),
  fetchThreads: ({ dispatch }, { ids }) => dispatch("fetchItems", { dataCollection: "threads", ids }),
  fetchForum: ({ dispatch }, { id }) => dispatch("fetchItem", { dataCollection: "forums", id }),
  fetchForums: ({ dispatch }, { ids }) => dispatch("fetchItems", { dataCollection: "forums", ids }),
  fetchAuthUser: ({ dispatch, state }) => dispatch("fetchItem", { dataCollection: "users", id: state.authId }),
  fetchUser: ({ dispatch }, { id }) => dispatch("fetchItem", { dataCollection: "users", id }),
  fetchUsers: ({ dispatch }, { ids }) => dispatch("fetchItems", { dataCollection: "users", ids }),
  fetchPost: ({ dispatch }, { id }) => dispatch("fetchItem", { dataCollection: "posts", id }),
  fetchPosts: ({ dispatch }, { ids }) => dispatch("fetchItems", { dataCollection: "posts", ids }),
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
  fetchItems({ dispatch }, { ids, dataCollection }) {
    return Promise.all(ids.map((id) => dispatch("fetchItem", { id, dataCollection })));
  },
};
