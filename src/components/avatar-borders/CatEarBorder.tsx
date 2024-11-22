import { JSXElement, Match, Show, Switch } from "solid-js";

export function CatEarsBorder(props: {
  children?: JSXElement;
  hovered?: boolean;
  size: number;
  offset?: number;
}) {
  return (
    <img
      class="cat-ears"
      style={{
        position: "absolute",
        width: "100%",
        "margin-top": (props.offset || 0) * props.size + "px",
        "z-index": "11111111111111",
      }}
      src="/borders/cat-ears.png"
    />
  );
}
