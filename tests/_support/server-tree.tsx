import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";

/* A page built from async server components cannot be drawn by the browser-side renderer. This runs every async component in the tree
   (the way the server does) and returns plain elements, ready for `renderApp`. */

type AsyncComponent = (props: unknown) => Promise<ReactNode>;

export async function resolveServerTree(node: ReactNode): Promise<ReactNode> {
  if (Array.isArray(node)) return Promise.all(node.map(resolveServerTree));
  if (!isValidElement(node)) return node;
  const { type, props } = node as ReactElement<{ children?: ReactNode }>;
  if (typeof type === "function" && type.constructor.name === "AsyncFunction") return resolveServerTree(await (type as AsyncComponent)(props));
  if (props.children === undefined) return node;
  const children = Array.isArray(props.children) ? await Promise.all(props.children.map(resolveServerTree)) : [await resolveServerTree(props.children)];
  return cloneElement(node, undefined, ...children);
}
