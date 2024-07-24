export type Email<T> = React.ComponentType<T> & {
  DefaultSubject: string;
  PreviewProps: T;
};
