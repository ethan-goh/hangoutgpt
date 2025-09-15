'use client';

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/app/components/ai-elements/conversation';
import { Message, MessageContent } from '@/app/components/ai-elements/message';
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  type PromptInputMessage,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from '@/app/components/ai-elements/prompt-input';
import { Fragment, useRef, useState, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from "ai";
import { Response } from '@/app/components/ai-elements/response';
import { GlobeIcon, RefreshCcwIcon, CopyIcon } from 'lucide-react';
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from '@/app/components/ai-elements/sources';
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/app/components/ai-elements/reasoning';
import { Loader } from '@/app/components/ai-elements/loader';
import { Button } from '@/app/components/ui/button';
import { emitNomSearch } from '@/lib/events';
import { FeatureCollection } from 'geojson';

const models = [
  {
    name: 'GPT 5o Mini',
    value: 'openai/gpt-5o-mini',
  },
];

const Chat = () => {
  const [input, setInput] = useState('');
  const [model, setModel] = useState<string>(models[0].value);
  const [webSearch, setWebSearch] = useState(false);
  const { messages, sendMessage, status, regenerate } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });

  const seen = useRef(new Set<string>());

  useEffect(() => {
    for (const m of messages) {
        const parts = m.parts ?? [];
        for (let i = 0; i < parts.length; i++) {
            const part: any = parts[i];
            if (part?.type === 'tool-places_search' && part.output) {
                const key = `${m.id}:${part.toolCallId ?? i}`;
                if (seen.current.has(key)) continue;
                seen.current.add(key);

                const fc = part.output as FeatureCollection;
                console.log('[chat] nom_search output → features:', fc.features?.length ?? 0);

                
                emitNomSearch(fc);
            }
        }
    }
    }, [messages]);

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    sendMessage(
      { 
        text: message.text || 'Sent with attachments',
        files: message.files 
      },
      {
        body: {
          model: model,
          webSearch: webSearch,
        },
      },
    );
    setInput('');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 relative size-full h-screen">
      <div className="flex flex-col h-full">
        <Conversation className="h-full">
          <ConversationContent>
            {messages.map((message) => (
              <div key={message.id}>
                {message.role === 'assistant' && message.parts.filter((part) => part.type === 'source-url').length > 0 && (
                  <Sources>
                    <SourcesTrigger
                      count={
                        message.parts.filter(
                          (part) => part.type === 'source-url',
                        ).length
                      }
                    />
                    {message.parts.filter((part) => part.type === 'source-url').map((part, i) => (
                      <SourcesContent key={`${message.id}-${i}`}>
                        <Source
                          key={`${message.id}-${i}`}
                          href={part.url}
                          title={part.url}
                        />
                      </SourcesContent>
                    ))}
                  </Sources>
                )}
                {message.parts.map((part, i) => {
                    switch (part.type) {
                        case 'text':
                        return (
													<Fragment key={`${message.id}-${i}`}>
													<Message from={message.role}>
															<MessageContent>
															<Response>
																	{part.text}
															</Response>
															</MessageContent>
													</Message>
													{message.role === 'assistant' && i === messages.length - 1 && (
															<div className="mt-2 flex gap-2">
															<Button
																	variant="outline"
																	size="sm"
																	onClick={() => regenerate?.()}
															>
																	<RefreshCcwIcon className="size-3 mr-1" />
																	Retry
															</Button>
															<Button
																	variant="outline"
																	size="sm"
																	onClick={() =>
																	navigator.clipboard.writeText(part.text)
																	}
															>
																	<CopyIcon className="size-3 mr-1" />
																	Copy
															</Button>
															</div>
													)}
													</Fragment>
                        );
                        case 'reasoning':
                        return (
                            <Reasoning
                            key={`${message.id}-${i}`}
                            className="w-full"
                            isStreaming={status === 'streaming' && i === message.parts.length - 1 && message.id === messages.at(-1)?.id}
                            >
                            <ReasoningTrigger />
                                <ReasoningContent>{part.text}</ReasoningContent>
                            </Reasoning>
                        );
                        case 'tool-places_search': {
                            const done = (part as any)?.output;
                            if (!done) {
                                return (
                                <div key={`${message.id}-${i}`} className="text-sm text-gray-600 italic mb-2">
                                    🔍 Searching for places...
                                </div>
                                );
                            }

                            const fc = done as FeatureCollection;
                            const names = (fc.features ?? [])
                                .map((f: any) => f?.properties?.short_name ?? f?.properties?.display_name)
                                .filter(Boolean)
                                .slice(0, 3)
                                .join(', ');
														

                            return (
															<Message key={`${message.id}-${i}`} from="assistant">
																<MessageContent>
																	<Response>
																		{(() => {
																			const count = fc.features?.length ?? 0;

																			const names = (fc.features ?? [])
																				.map((f: any) =>
																					f?.properties?.short_name ??
																					f?.properties?.display_name ??
																					f?.properties?.name
																				)
																				
																				.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);

																			if (count === 0) {
																				return [
																					'No places matched that search.',
																					'Try a more specific name, adjust spelling, or broaden the area (e.g., "cafes near Jurong East").',
																				].join('\n\n');
																			}

																			const MAX_ITEMS = 5; 
																			const list = names
																				.slice(0, MAX_ITEMS)
																				.map((n, i) => `${i + 1}. **${n}**`)
																				.join('\n');

																			
																			return [
																				`Found and plotted ${count} place${count === 1 ? '' : 's'} on the map.`,
																				names.length ? `Top matches:\n${list}` : '',
																				'Click a place on the map to see more info.',
																			]
																				.filter(Boolean)
																				.join('\n\n');
																		})()}
																	</Response>
																</MessageContent>
															</Message>
														);
                            }
                        default:
                        console.log('Unknown part type:', part.type, part);
                        return null;
                    }
                    })}
              </div>
            ))}
            {status === 'submitted' && <Loader />}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <PromptInput onSubmit={handleSubmit} className="mt-4" globalDrop multiple>
          <PromptInputBody>
            <PromptInputTextarea
              onChange={(e) => setInput(e.target.value)}
              value={input}
            />
          </PromptInputBody>
          <PromptInputToolbar>
            <PromptInputTools>
            <PromptInputButton
                variant={webSearch ? 'default' : 'ghost'}
                onClick={() => setWebSearch(!webSearch)}
            >
                <GlobeIcon size={16} />
                <span>Search</span>
            </PromptInputButton>

            
            <label className="sr-only" htmlFor="model">Model</label>
            <select
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
                {models.map((m) => (
                <option key={m.value} value={m.value}>
                    {m.name}
                </option>
                ))}
            </select>
            </PromptInputTools>
            <PromptInputSubmit disabled={!input && !status} status={status} />
          </PromptInputToolbar>
        </PromptInput>
      </div>
    </div>
  );
};

export default Chat;