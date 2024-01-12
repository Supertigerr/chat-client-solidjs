import env from "../../common/env";
import { RawChannel, RawChannelNotice, RawInboxWithoutChannel, RawMessage, RawPost, RawServer, RawUser, RawUserConnection } from "../RawData";
import { Presence, UserStatus } from "../store/useUsers";
import { request } from "./Request";
import ServiceEndpoints from "./ServiceEndpoints";



export async function createGoogleAccountLink (): Promise<string> {
  return request({
    url: env.SERVER_URL + "/api/google/create-link",
    method: "GET",
    notJSON: true,
    useToken: true
  });
}

export async function linkAccountWithGoogle (code: string, nerimityUserToken: string): Promise<{connection: RawUserConnection}> {
  return request({
    url: env.SERVER_URL + "/api/google/link-account",
    method: "POST",
    body: {
      code,
      nerimityToken: nerimityUserToken
    },
    useToken: false
  });
}
export async function unlinkAccountWithGoogle (): Promise<{status: boolean}> {
  return request({
    url: env.SERVER_URL + "/api/google/unlink-account",
    method: "POST",
    useToken: true
  });
}

export async function getGoogleAccessToken (): Promise<{accessToken: string}> {
  return request({
    url: env.SERVER_URL + "/api/google/access-token",
    method: "GET",
    useToken: true
  });
}



export async function sendEmailConfirmCode(): Promise<{message: string}> {
  return request({
    url: env.SERVER_URL + "/api" + ServiceEndpoints.user("emails/verify/send-code"),
    method: "POST",
    useToken: true
  });
}
export async function verifyEmailConfirmCode(code: string): Promise<{status: boolean}> {
  return request({
    url: env.SERVER_URL + "/api" + ServiceEndpoints.user("emails/verify"),
    params: {code},
    method: "POST",
    useToken: true
  });
}



// Returns {token}
// error returns {path?, message}
export async function loginRequest(email: string, password: string): Promise<{token: string}> {
  const isUsernameAndTag = email.includes(":")
  return request({
    url: env.SERVER_URL + "/api" + ServiceEndpoints.login(),
    method: "POST",
    body: {
      ...(isUsernameAndTag ? {usernameAndTag: email} : {email}),
      password
    }
  });
}


// Returns {token}
// error returns {path?, message}
export async function registerRequest(email: string, username: string, password: string, token: string): Promise<{token: string}> {
  return request({
    url: env.SERVER_URL + "/api" + ServiceEndpoints.register(),
    method: "POST",
    body: {
      email,
      username,
      password,
      token
    }
  });
}

export interface UserDetails {
  block: boolean;
  user: RawUser & {
    _count: {
      followers: number, 
      following: number
      likedPosts: number
      posts: number
    }, 
    following: any[], 
    followers: any[]
  };
  mutualFriendIds: string[];
  mutualServerIds: string[];
  latestPost: RawPost
  profile?: UserProfile

}
export interface UserProfile {
  bio?: string;
  pronouns?: string;
}

export async function getUserDetailsRequest(userId?: string) {
  return request<UserDetails>({
    url: env.SERVER_URL + "/api" + ServiceEndpoints.user(userId || ""),
    method: "GET",
    useToken: true
  });
}

export interface RawNotification {
  message: RawMessage;
  server: RawServer
}

export async function getUserNotificationsRequest() {
  return request<RawNotification[]>({
    url: env.SERVER_URL + "/api" + ServiceEndpoints.user("notifications"),
    method: "GET",
    useToken: true
  });
}

export async function getFollowers(userId?: string) {
  return request<RawUser[]>({
    url: env.SERVER_URL + "/api" + ServiceEndpoints.user(userId || "") + "/followers",
    method: "GET",
    useToken: true
  });
}
export async function getFollowing(userId?: string) {
  return request<RawUser[]>({
    url: env.SERVER_URL + "/api" + ServiceEndpoints.user(userId || "") + "/following",
    method: "GET",
    useToken: true
  });
}


export async function openDMChannelRequest(userId: string) {
  return request<RawInboxWithoutChannel & {channel: RawChannel}>({
    url:  env.SERVER_URL + "/api" + ServiceEndpoints.openUserDM(userId),
    method: 'POST',
    useToken: true
  });
}
export async function closeDMChannelRequest(channelId: string) {
  return request({
    url:  env.SERVER_URL + "/api" + ServiceEndpoints.channel(channelId),
    method: 'DELETE',
    useToken: true
  });
}

export async function blockUser(userId: string) {
  return request({
    url:  env.SERVER_URL + "/api" + ServiceEndpoints.user(userId) + "/block",
    method: 'POST',
    useToken: true
  });
}
export async function unblockUser(userId: string) {
  return request({
    url:  env.SERVER_URL + "/api" + ServiceEndpoints.user(userId) + "/block",
    method: 'DELETE',
    useToken: true
  });
}

export async function updatePresence(presence: Partial<Presence>) {
  return request<RawInboxWithoutChannel & {channel: RawChannel}>({
    url:  env.SERVER_URL + "/api" + ServiceEndpoints.updatePresence(),
    method: 'POST',
    body: presence,
    useToken: true
  });
}

interface UpdateUserOptions {
  email?: string;
  username?: string;
  avatar?: string;
  banner?: string;
  tag?: string;
  password?: string;
  newPassword?: string;
  bio?: string | null;
  pronouns?: string | null;
  socketId?: string;
  dmStatus?: number;
}
export async function updateUser(body: UpdateUserOptions) {
  return request<{user: any, newToken?: string, }>({
    url:  env.SERVER_URL + "/api" + ServiceEndpoints.user(""),
    method: 'POST',
    body,
    useToken: true
  });
}
export async function followUser(userId: string) {
  return request({
    url:  env.SERVER_URL + "/api" + ServiceEndpoints.userFollow(userId),
    method: 'POST',
    useToken: true
  });
}
export async function unfollowUser(userId: string) {
  return request({
    url:  env.SERVER_URL + "/api" + ServiceEndpoints.userFollow(userId),
    method: 'DELETE',
    useToken: true
  });
}


interface UpdateServerSettings {
  notificationSoundMode?: number;
  notificationPingMode?: number;
}

export async function updateServerSettings(serverId: string, update: UpdateServerSettings) {
  return request({
    url: env.SERVER_URL + "/api" + ServiceEndpoints.user("servers/") + serverId,
    method: "POST",
    useToken: true,
    body: update
  });
}



export async function deleteAccount(password: string) {
  return request({
    url: env.SERVER_URL + "/api" + ServiceEndpoints.user("delete-account"),
    method: "DELETE",
    useToken: true,
    body: {password}
  });
}



export const updateDMChannelNotice = async (content: string) => {
  const data = await request<{notice: RawChannelNotice}>({
    method: 'PUT',
    url: env.SERVER_URL + "/api" + ServiceEndpoints.user("channel-notice"),
    body: {content},
    useToken: true,
  });
  return data;
};

export const deleteDMChannelNotice = async () => {
  const data = await request({
    method: 'DELETE',
    url: env.SERVER_URL + "/api" + ServiceEndpoints.user("channel-notice"),
    useToken: true,
  });
  return data;
};
export const getDMChannelNotice = async () => {
  const data = await request<{notice: RawChannelNotice}>({
    method: 'GET',
    url: env.SERVER_URL + "/api" + ServiceEndpoints.user("channel-notice"),
    useToken: true,
  });
  return data;
};