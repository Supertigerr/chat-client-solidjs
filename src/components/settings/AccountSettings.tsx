import { createEffect, createSignal, lazy, on, onCleanup, onMount, Setter, Show } from 'solid-js';
import useStore from '@/chat-api/store/useStore';
import Input from '@/components/ui/input/Input';
import Button from '@/components/ui/Button';
import { createUpdatedSignal } from '@/common/createUpdatedSignal';
import SettingsBlock from '@/components/ui/settings-block/SettingsBlock';
import Text from '@/components/ui/Text';
import { css, styled } from 'solid-styled-components';
import { deleteAccount, deleteDMChannelNotice, getDMChannelNotice, getUserDetailsRequest, sendEmailConfirmCode, updateDMChannelNotice, updateUser, UserDetails, verifyEmailConfirmCode } from '@/chat-api/services/UserService';
import FileBrowser, { FileBrowserRef } from '../ui/FileBrowser';
import { reconcile } from 'solid-js/store';
import Breadcrumb, { BreadcrumbItem } from '../ui/Breadcrumb';
import { t } from 'i18next';
import { Route, Routes, useMatch } from '@solidjs/router';
import { CustomLink } from '../ui/CustomLink';
import { getStorageString, setStorageString, StorageKeys } from '@/common/localStorage';
import socketClient from '@/chat-api/socketClient';
import DeleteConfirmModal from '../ui/delete-confirm-modal/DeleteConfirmModal';
import { useCustomPortal } from '../ui/custom-portal/CustomPortal';
import useServers from '@/chat-api/store/useServers';
import Modal from '../ui/modal/Modal';
import { FlexColumn, FlexRow } from '../ui/Flexbox';
import { Notice } from '../ui/Notice/Notice';
import { getChannelNotice } from '@/chat-api/services/ChannelService';
import { RawChannelNotice } from '@/chat-api/RawData';

const ImageCropModal = lazy(() => import ("../ui/ImageCropModal"))

const Container = styled("div")`
  display: flex;
  flex-direction: column;
  padding: 10px;
`;

type UpdateHeader = Setter<{ username?: string, banner?: string; tag?: string, avatar?: any, avatarPoints?: number[] }>;

export default function AccountSettings(props: { updateHeader: UpdateHeader }) {
  const { header } = useStore();

  createEffect(() => {
    header.updateHeader({
      title: "Settings - Account",
      iconName: 'settings',
    });
  })

  onCleanup(() => {
    props.updateHeader(reconcile({}));
  })

  const isProfilePage = useMatch(() => "app/settings/account/profile")

  return (
    <Container>
      <Breadcrumb>
        <BreadcrumbItem href='/app' icon='home' title="Dashboard" />
        <BreadcrumbItem title={t('settings.drawer.account')} href='../account' />
        <Show when={isProfilePage()}>
          <BreadcrumbItem title="Profile" />
        </Show>

      </Breadcrumb>

      <Routes>
        <Route path="/" element={<EditAccountPage updateHeader={props.updateHeader} />} />
        <Route path="/profile" element={<EditProfilePage />} />
      </Routes>
    </Container>
  )
}


const ChangePasswordButton = styled("button")`
  color: var(--primary-color);
  background-color: transparent;
  border: none;
  align-self: flex-start;
  cursor: pointer;
  user-select: none;
  &:hover {
    text-decoration: underline;
  }
`

function EditAccountPage(props: { updateHeader: UpdateHeader }) {
  const { account } = useStore();
  const [requestSent, setRequestSent] = createSignal(false);
  const [error, setError] = createSignal<null | string>(null);
  const [avatarFileBrowserRef, setAvatarFileBrowserRef] = createSignal<undefined | FileBrowserRef>()
  const [bannerFileBrowserRef, setBannerFileBrowserRef] = createSignal<undefined | FileBrowserRef>()

  const [showResetPassword, setShowResetPassword] = createSignal(false);

  const user = () => account.user();

  const defaultInput = () => ({
    email: user()?.email || '',
    username: user()?.username || '',
    tag: user()?.tag || '',
    password: '',
    newPassword: '',
    confirmNewPassword: '',
    avatar: '',
    avatarPoints: null as null | number[],
    banner: '',
  })

  const [inputValues, updatedInputValues, setInputValue] = createUpdatedSignal(defaultInput);


  const onSaveButtonClicked = async () => {
    if (requestSent()) return;
    setRequestSent(true);
    setError(null);

    if (updatedInputValues().newPassword) {
      if (updatedInputValues().newPassword !== updatedInputValues().confirmNewPassword) {
        setError("Confirm password does not match.")
        setRequestSent(false);
        return;
      }

      if (updatedInputValues().newPassword!.length > 72) {
        setError('Password must be less than 72 characters.')
        setRequestSent(false);
        return;
      }

    }


    const values = { ...updatedInputValues(), socketId: socketClient.id(), confirmNewPassword: undefined };
    await updateUser(values)
      .then((res) => {
        if (res.newToken) {
          setStorageString(StorageKeys.USER_TOKEN, res.newToken);
          socketClient.updateToken(res.newToken);
        }
        if (values.email && values.email !== account.user()?.email) {
          account.setUser({emailConfirmed: false})
        }
        setShowResetPassword(false)
        setInputValue("password", '')
        setInputValue("newPassword", '')
        setInputValue("confirmNewPassword", '')
        setInputValue("avatar", '')
        setInputValue("avatarPoints", null)
        setInputValue("banner", '')
        props.updateHeader(reconcile({}));
      })
      .catch(err => {
        setError(err.message)
      })
      .finally(() => setRequestSent(false))
  }

  const requestStatus = () => requestSent() ? 'Saving...' : 'Save Changes';


  const {createPortal} = useCustomPortal();

  const onCropped = (points: [number, number, number]) => {
    setInputValue("avatarPoints", points);
    props.updateHeader({ avatarPoints: points });
  }

  const onAvatarPick = (files: string[]) => {
    if (files[0]) {
      createPortal(close => <ImageCropModal close={close} image={files[0]} onCropped={onCropped} />)
      setInputValue("avatar", files[0])
      props.updateHeader({ avatar: files[0] })
    }
  }

  const onBannerPick = (files: string[]) => {
    if (files[0]) {
      setInputValue("banner", files[0])
      props.updateHeader({ banner: files[0] })

    }
  }

  const onChangePasswordClick = () => {
    setInputValue("newPassword", '')
    setInputValue("confirmNewPassword", '')
    setShowResetPassword(!showResetPassword())
  }

  return (
    <>
      <Show when={account.user() && !account.user()?.emailConfirmed}>
        <ConfirmEmailNotice/>
      </Show>
      <SettingsBlock class={css`position: relative; z-index: 111;`} icon='email' label='Email'>
        <Input value={inputValues().email} onText={(v) => setInputValue('email', v)} />
      </SettingsBlock>



      <SettingsBlock icon='face' label='Username'>
        <Input value={inputValues().username} onText={(v) => setInputValue('username', v)} />
      </SettingsBlock>

      <SettingsBlock icon='local_offer' label='Tag'>
        <Input class={css`width: 52px;`} value={inputValues().tag} onText={(v) => setInputValue('tag', v)} />
      </SettingsBlock>

      <SettingsBlock icon='wallpaper' label='Avatar' description='Supported: JPG, PNG, GIF, WEBP, Max 12 MB'>
        <FileBrowser accept='images' ref={setAvatarFileBrowserRef} base64 onChange={onAvatarPick} />
        <Show when={inputValues().avatar}>
          <Button margin={0} color='var(--alert-color)' iconSize={18} iconName='close' onClick={() => { setInputValue("avatar", ""); setInputValue("avatarPoints", null); props.updateHeader({ avatar: undefined, avatarPoints: undefined }); }} />
        </Show>
        <Button iconSize={18} iconName='attach_file' label='Browse' onClick={avatarFileBrowserRef()?.open} />
      </SettingsBlock>

      <SettingsBlock icon='panorama' label='Banner' description='Supported: JPG, PNG, GIF, WEBP, Max 12 MB'>
        <FileBrowser accept='images' ref={setBannerFileBrowserRef} base64 onChange={onBannerPick} />
        <Show when={inputValues().banner}>
          <Button margin={0} color='var(--alert-color)' iconSize={18} iconName='close' onClick={() => { setInputValue("banner", ""); props.updateHeader({ banner: undefined }); }} />
        </Show>
        <Button iconSize={18} iconName='attach_file' label='Browse' onClick={bannerFileBrowserRef()?.open} />
      </SettingsBlock>

      <SettingsBlock icon='info' label='Profile' description='Edit your bio'>
        <CustomLink href='./profile'>
          <Button iconSize={18} iconName='edit' label='Edit' />
        </CustomLink>
      </SettingsBlock>
      <ChangePasswordButton onClick={onChangePasswordClick} style={{ "margin-bottom": "5px" }}>Change Password</ChangePasswordButton>


      <Show when={showResetPassword()}>
        <SettingsBlock icon='password' label='New Password' description='Changing your password will log you out everywhere else.'>
          <Input type='password' value={inputValues().newPassword} onText={(v) => setInputValue('newPassword', v)} />
        </SettingsBlock>
        <SettingsBlock icon='password' label='Confirm New Password' description='Confirm your new password'>
          <Input type='password' value={inputValues().confirmNewPassword} onText={(v) => setInputValue('confirmNewPassword', v)} />
        </SettingsBlock>
      </Show>


      <Show when={Object.keys(updatedInputValues()).length}>
        <SettingsBlock icon='password' label='Confirm Password'>
          <Input type='password' value={inputValues().password} onText={(v) => setInputValue('password', v)} />
        </SettingsBlock>
      </Show>


      <Show when={error()}><Text size={12} color="var(--alert-color)" style={{ "margin-top": "5px" }}>{error()}</Text></Show>
      <Show when={Object.keys(updatedInputValues()).length}>
        <Button iconName='save' label={requestStatus()} class={css`align-self: flex-end;`} onClick={onSaveButtonClicked} />
      </Show>


      <ChannelNoticeBlock/>



      <DeleteAccountBlock />
    </>
  )
}


const deleteAccountBlockStyles = css`
  margin-top: 50px;
  border: solid 1px var(--alert-color);
`;


function DeleteAccountBlock() {
  const {createPortal} = useCustomPortal();
  const {array} = useServers();

  const serverCount = () => array().length;

  const onDeleteClick = async (password: string) => {
    let err = "";
    await deleteAccount(password).catch(error => {
      err = error.message;
    })
    if (!err) {
      location.href = "/"
    }
    return err;
  }

  
  const onClick = () => {
    const ModalInfo = () => {
      return (
        <div style={{"margin-bottom": "15px"}}>
          What will get deleted:
          <div >• Email</div>
          <div>• Username</div>
          <div>• IP Address</div>
          <div>• Bio</div>
          <div >• And More</div>
          <div style={{"margin-top": "15px"}}>What will not get deleted:</div>
          <div>• Your Messages</div>
          <div>• Your Posts</div>
          <div style={{"margin-top": "5px", "font-size": "12px"}}>You may manually delete them before deleting your account.</div>
        </div>
      )
    }
    if (serverCount()) {
      createPortal(close => <DeleteAccountNoticeModal close={close}/>)
      return;
    }
    createPortal(close => <DeleteConfirmModal onDeleteClick={onDeleteClick} custom={<ModalInfo/>} close={close} confirmText='account' title='Delete Account' password />)
  }
  
  return (
    <SettingsBlock class={deleteAccountBlockStyles} icon='delete' label='Delete My Account' description='This cannot be undone!'>
      <Button onClick={onClick} iconSize={18} primary color='var(--alert-color)' iconName='delete' label='Delete My Account' />
    </SettingsBlock>
  )
}

function DeleteAccountNoticeModal(props: {close():void}) {
  return (
    <Modal title='Delete Account' icon='delete' actionButtons={<Button iconName='check' styles={{"margin-left": 'auto'}} label='Understood' onClick={props.close} />} maxWidth={300}>
    <Text style={{padding: "10px"}}>You must leave/delete all servers before you can delete your account.</Text>
  </Modal>
  )
}




const bioBlockStyles = css`
  && {
    height: initial;
    min-height: initial;
    align-items: start;
    flex-direction: column;
    flex: 0;
    padding-top: 15px;
    align-items: stretch;
  }
  .inputContainer {
    margin-left: 35px;
    margin-top: 5px;
  }
  textarea {
    height: 100px;
  }
`;

const pronounBlockStyles = css`
  && {
    height: initial;
    min-height: initial;
    align-items: start;
    flex-direction: column;
    flex: 0;
    padding-top: 15px;
    align-items: stretch;
  }
  .inputContainer {
    margin-left: 35px;
    margin-top: 5px;
  }
  textarea {
    height: 100px;
  }
`

function EditProfilePage() {
  const { account } = useStore();
  const [userDetails, setUserDetails] = createSignal<UserDetails | null>(null);
  const [error, setError] = createSignal<null | string>(null);
  const [requestSent, setRequestSent] = createSignal(false);

  const defaultInput = () => ({
    bio: userDetails()?.profile?.bio || '',
    pronouns: userDetails()?.profile?.pronouns || '',
  })

  const [inputValues, updatedInputValues, setInputValue] = createUpdatedSignal(defaultInput);

  createEffect(on(account.user, (user) => {
    if (!user) return;
    getUserDetailsRequest(account.user()?.id).then(setUserDetails)
  }))

  const requestStatus = () => requestSent() ? 'Saving...' : 'Save Changes';

  const onSaveButtonClicked = async () => {
    if (requestSent()) return;
    setRequestSent(true);
    setError(null);
    const values = updatedInputValues();
    values.bio = values.bio ?? userDetails()?.profile?.bio;
    values.pronouns = values.pronouns ?? userDetails()?.profile?.pronouns;
    await updateUser({
      bio: values.bio?.trim() || null,
      pronouns: values.pronouns?.trim() || null
    })
      .then(() => {
        setUserDetails(() => (
          {
            ...userDetails()!,
            profile: { 
              bio: values.bio,
              pronouns: values.pronouns
            }
          }
        ))
      })
      .catch(err => {
        setError(err.message)
      })
      .finally(() => setRequestSent(false))
  }

  return (
    <>
      <SettingsBlock icon='info' label='Bio' class={bioBlockStyles} description='Multiline and markup support'>
        <Text size={12} style={{ "margin-left": "38px", "margin-top": "5px" }}>({inputValues().bio.length} / 1000)</Text>
        <Input class='inputContainer' type='textarea' value={inputValues().bio} onText={(v) => setInputValue('bio', v)} />
      </SettingsBlock>

      <SettingsBlock icon='face' label='Pronouns' class={pronounBlockStyles} description='Either select or use a custom one'>
        <Text size={12} style={{ "margin-left": "38px", "margin-top": "5px" }}></Text>
        <div  style={{ "margin-left": "38px", "display": 'flex' }}>
          <Button label="he/him" onClick={() => setInputValue('pronouns', 'he/him')} />
          <Button label="she/her" onClick={() => setInputValue('pronouns', 'she/her')} />
          <Button label="they/them" onClick={() => setInputValue('pronouns', 'they/them')} />
          <Button label="Rather not say" onClick={() => setInputValue('pronouns', 'Rather not say')} />
        </div>
        <a></a>
        <Text size={12} style={{ "margin-left": "38px", "margin-top": "5px" }}>({inputValues().pronouns.length} / 16)</Text>
        <Input class='inputContainer' type='textarea' value={inputValues().pronouns} onText={(v) => setInputValue('pronouns', v)} />
      </SettingsBlock>

      <Show when={error()}><Text size={12} color="var(--alert-color)" style={{ "margin-top": "5px" }}>{error()}</Text></Show>
      <Show when={Object.keys(updatedInputValues()).length}>
        <Button iconName='save' label={requestStatus()} class={css`align-self: flex-end;`} onClick={onSaveButtonClicked} />
      </Show>
    </>
  )
}





const NoticeBlockStyle = css`
  && {
    height: initial;
    min-height: initial;
    align-items: start;
    flex-direction: column;
    flex: 0;
    padding-top: 15px;
    align-items: stretch;
  }
  .inputContainer {
    margin-left: 35px;
    margin-top: 5px;
  }
  textarea {
    min-height: 100px;
  }
`;



function ChannelNoticeBlock () {
  const [error, setError] = createSignal<string>("");
  const [channelNotice, setChannelNotice] = createSignal<RawChannelNotice | null>(null);
  
  const defaultInput = () => ({
    content: channelNotice()?.content || ''
  })

  const [inputValues, updatedInputValues, setInputValue] = createUpdatedSignal(defaultInput);

  onMount(async () => {
    const res = await getDMChannelNotice();
    if (!res) return;
    setChannelNotice(res.notice);
  }) 



  const save = async () => {
    setError("")
    if (inputValues().content.length > 300) return setError("Channel notice cannot be longer than 300 characters.");
    const res = await updateDMChannelNotice(inputValues().content).catch((err) => {
      setError(err.message);
    })
    if (!res) return;
    setChannelNotice(res.notice);
    setInputValue("content", res.notice.content);
  }

  const deleteNotice = async () => {
    const res = await deleteDMChannelNotice().catch((err) => {
      setError(err.message);
    })
    if (!res) return;
    setChannelNotice(null);
    setInputValue("content", "");
  }

  return (
    <div style={{"margin-bottom": "35px", "padding-bottom": "30px", "border-bottom": "solid 1px rgba(255,255,255,0.2)"}}>
      <SettingsBlock icon='info' label='Channel Notice' class={NoticeBlockStyle} description='Shows when the user is about to chat for the first time. Changes apply after reload.'>
        <Text size={12} style={{ "margin-left": "38px", "margin-top": "5px" }}>({inputValues().content.length} / 300)</Text>
        <Input class='inputContainer' type='textarea' value={inputValues().content} onText={(v) => setInputValue("content", v)} />
        <Show when={error()}><Text style={{"margin-left": "40px"}} color='var(--alert-color)'>{error()}</Text></Show>

        <div style={{ display: 'flex', "align-self": "flex-end", "margin-top": "15px" }}>
          <Show when={channelNotice()?.content}><Button label='Remove Notice' color='var(--alert-color)' iconName='delete' onClick={deleteNotice} /></Show>
          <Show when={updatedInputValues().content}><Button  label='Save' iconName='save'  onClick={save} /></Show>

        </div>
      </SettingsBlock>
    </div>
  )
}



let lastConfirmClickedTime: number | null = null;

const ConfirmEmailNotice = () => {
  const [now, setNow] = createSignal(Date.now());
  const {createPortal} = useCustomPortal();

  onMount(() => {
    const timerId = setInterval(() => {
      setNow(Date.now())
    }, 1000)
    onCleanup(() => {
      clearInterval(timerId)
    })
  })

  const remainingTimeInSeconds = () => {
    const n = now()
    if (!lastConfirmClickedTime) return 0;
    const time = (60 -(n - lastConfirmClickedTime) / 1000);
    if (time < 0) return 0;
    return Math.round(time);
  }

  const onSendCodeClick = async () => {
    if (remainingTimeInSeconds()) {
      return;
    }
    lastConfirmClickedTime = Date.now();
    setNow(Date.now())
    
    const res = await sendEmailConfirmCode().catch(err => {
      const ttl = err.ttl
      if (!ttl) return;
      lastConfirmClickedTime = Date.now() - (60000 - ttl);
      setNow(Date.now())
    })
    if (!res) return;
    
    lastConfirmClickedTime = Date.now();
    setNow(Date.now())

    createPortal(close => <ConfirmEmailModal message={res.message} close={close}/>)
  
  }

  return (
    <Notice 
      type='warn' 
      description='Confirm your email'
      class={css`margin-bottom: 10px;`} 
    >
      <div style={{"margin-left": 'auto'}}></div>
      <Button 
        label={remainingTimeInSeconds() ? `Resend in ${remainingTimeInSeconds()}` : 'Send Code'} 
        primary 
        margin={0} 
        onClick={onSendCodeClick} 
      />
    </Notice>
  )
}

const ConfirmEmailModal = (props: {close():void, message: string}) => {
  const {account} = useStore();
  const [code, setCode] = createSignal('');
  const [errorMessage, setErrorMessage] = createSignal('');

  const confirmClicked = async () => {
    setErrorMessage('')
    const res = await verifyEmailConfirmCode(code()).catch(err => {
      setErrorMessage(err.message);
    })
    if (res?.status) {
      props.close();
      account.setUser({emailConfirmed: true});
    }
  }

  const actionButtons = (
    <FlexRow style={{flex: 1}}>
      <Button onClick={props.close} styles={{flex: 1}} iconName='close' label='Cancel' color='var(--alert-color)' />
      <Button styles={{flex: 1}} iconName='check' label='Confirm' onClick={confirmClicked} primary />
    </FlexRow>
  );
  

  return (
    <Modal ignoreBackgroundClick title='Confirm Email' close={props.close} actionButtons={actionButtons}>
      <FlexColumn class={css`align-items: center; margin: 10px;`} gap={10}>
        <Text color='var(--success-color)'>{props.message}</Text>
        <Text size={14}>Enter the 5 digit code sent to your email:</Text>

        <Input 
          value={code()}
          onText={setCode}
          placeholder='_ _ _ _ _' 
          class={css`width: 140px; input {font-size: 30px;}`} 
        />
        <Text color='var(--alert-color)' size={14}>{errorMessage()}</Text>
      </FlexColumn>

    </Modal>
  )
}
