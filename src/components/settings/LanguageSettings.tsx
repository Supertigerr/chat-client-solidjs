import { createEffect, createSignal, For} from 'solid-js';
import Text from '@/components/ui/Text';
import { styled } from 'solid-styled-components';
import { getCurrentLanguage, getLanguage, Language, languages, setCurrentLanguage } from '@/locales/languages';

import ItemContainer from '../ui/Item';
import twemoji from 'twemoji';
import { FlexColumn } from '../ui/Flexbox';
import useStore from '@/chat-api/store/useStore';
import { useTransContext } from '@mbarzda/solid-i18next';

const Container = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px;
`;

const LanguageItemContainer = styled(ItemContainer)`
  padding: 5px;
  gap: 10px;
  padding-left: 10px;
`;

export default function LanguageSettings() {
  const {header} = useStore();
  const [, actions] = useTransContext();

  const [currentLocalLanguage, setCurrentLocalLanguage] = createSignal(getCurrentLanguage() || "en_gb");

  createEffect(() => {
    header.updateHeader({
      title: "Settings - Language",
      iconName: 'settings',
    });
  })

  const languageKeys = Object.keys(languages);



  const setLanguage = async (key: string) => {
    key = key.replace("-", "_");
    if (key !== "en_gb") {
      const language = await getLanguage(key);
      if (!language) return;
      actions.addResources(key, "translation", language);
    }
    actions.changeLanguage(key);
    setCurrentLanguage(key);
    setCurrentLocalLanguage(key);
  }


  return (
    <Container>
      <For each={languageKeys}>
        {key => <LanguageItem selected={currentLocalLanguage().replace("_", "-") === key} onClick={() => setLanguage(key)} key={key}/>}
      </For>
    </Container>
  )
}

function LanguageItem(props: {key: string, selected: boolean, onClick: () => void}) {
  const language = (languages as any)[props.key] as Language;
  

  return (
    <LanguageItemContainer onclick={props.onClick}  selected={props.selected}>
      <Emoji val={language.emoji}/>
      <FlexColumn>
        <Text>{language.name}</Text>
        <Text size={12} opacity={0.7}>Contributors: {language.contributors.join(", ")}</Text>
      </FlexColumn>
    </LanguageItemContainer>
  )
}

function Emoji({val}: {val: string}) {
  var div = document.createElement('div');
  div.innerHTML = twemoji.parse(val);
  const el = div.firstChild as HTMLImageElement;
  el.style.height = "30px";
  return el;
}