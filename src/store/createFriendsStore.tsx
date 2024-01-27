import { RawFriend } from "@/chat-api/RawData";
import { ContextStore } from "./store";
import { createDispatcher } from "./createDispatcher";
import { createStore, reconcile } from "solid-js/store";
import { batch } from "solid-js";


type Friend = {
  recipientId: string;
} & Omit<RawFriend, 'recipient'>;

const [friends, setFriends] = createStore<Record<string, Friend>>({});

const SET_FRIENDS = (friends: Friend[]) => {
  batch(() => {
    for (let i = 0; i < friends.length; i++) {
      const friend = friends[i];
      setFriends(friend.recipientId, reconcile(friend));
    }
  })

}

const actions = {
  SET_FRIENDS
}


export const createFriendsStore = (state: ContextStore) => {  
  const dispatch = createDispatcher(actions, state);

  const setFriends = async (friends: RawFriend[]) => {
    dispatch("SET_FRIENDS", friends.map(({recipient, ...rest}) => {
      return {...rest, recipientId: recipient.id};
    }))
  }
  
  
  return {
    dispatch,
    setFriends
  }

}