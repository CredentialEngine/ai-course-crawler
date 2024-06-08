import { useEffect, useState } from "react";

export type TrackedSseMessage<T> = {
  data: T;
  isNew: boolean;
};

export function useSse<T>(url: string, eventName: string = "message") {
  const [messages, setMessages] = useState<TrackedSseMessage<T>[]>([]);
  const [newMessage, setNewMessage] = useState<
    TrackedSseMessage<T> | undefined
  >();

  useEffect(() => {
    const eventSource = new EventSource(url);
    const onMessageHandler:
      | ((this: EventSource, ev: MessageEvent) => any)
      | null = (event: MessageEvent) => {
      const incoming = { data: JSON.parse(event.data) as T, isNew: true };
      setMessages((currentMessages) => [
        ...currentMessages.map((m) => ({ ...m, isNew: false })),
        incoming,
      ]);
      setNewMessage(incoming);
    };
    eventSource.addEventListener(eventName, onMessageHandler);
    return () => {
      eventSource.close();
    };
  });

  return { messages, newMessage };
}
