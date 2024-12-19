import React, { useState, useEffect, useRef } from "react";

interface ChatModalProps {
  onClose: () => void;
  user: { id: number; username: string }; // Usuário logado
  socket: WebSocket | null; // WebSocket gerenciado pelo App
}

interface User {
  id: number;
  username: string;
  isOnline: boolean;
}

interface Message {
  senderId: number;
  userId?: number;
  content: string;
  createdAt: string;
}

const ChatModal: React.FC<ChatModalProps> = ({ onClose, user, socket }) => {
  const [users, setUsers] = useState<User[]>([]); // Todos os usuários
  const [messages, setMessages] = useState<Message[]>([]); // Mensagens trocadas
  const [currentMessage, setCurrentMessage] = useState(""); // Mensagem atual
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null); // Usuário selecionado
  const messagesEndRef = useRef<HTMLDivElement | null>(null); // Referência ao final da lista de mensagens

  // Buscar todos os usuários ao abrir o modal
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch("http://localhost:3000/user/users");
        const data = await response.json();

        // Filtrar o próprio usuário da lista
        const filteredUsers = data.filter((u: User) => u.id !== user.id);
        setUsers(filteredUsers);
      } catch (error) {
        console.error("Erro ao buscar usuários:", error);
      }
    };

    fetchUsers();
  }, [user.id]);

  // Lidar com mensagens recebidas pelo WebSocket
  useEffect(() => {
    if (socket) {
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        // Atualizar mensagens
        if (data.type === "message") {
          setMessages((prev) => [...prev, data.message]);
        }

        // Atualizar lista de usuários online
        if (data.type === "onlineUsers") {
          setUsers((prevUsers) => {
            return prevUsers.map((userItem) => {
              const updatedUser = data.users.find(
                (u: User) => u.id === userItem.id
              );
              return updatedUser
                ? { ...userItem, isOnline: true }
                : { ...userItem, isOnline: false };
            });
          });
        }
      };
    }
  }, [socket]);

  // Buscar mensagens ao selecionar um usuário
  const handleSelectUser = async (userId: number) => {
    setSelectedUserId(userId);

    try {
      const response = await fetch(
        `http://localhost:3000/chat/messages?userId=${user.id}&targetId=${userId}`
      );
      const data = await response.json();

      if (response.ok) {
        setMessages(data); // Atualizar mensagens
        console.log(messages);

        scrollToBottom(); // Mover o scroll para o final
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error("Erro ao buscar mensagens:", error);
    }
  };

  // Enviar mensagem
  const handleSendMessage = () => {
    if (socket && selectedUserId && currentMessage) {
      const messageData = {
        type: "message",
        senderId: user.id,
        targetId: selectedUserId,
        content: currentMessage,
      };

      socket.send(JSON.stringify(messageData));
      setMessages((prev) => [
        ...prev,
        {
          senderId: user.id,
          content: currentMessage,
          createdAt: new Date().toISOString(),
        },
      ]);
      setCurrentMessage("");
      scrollToBottom(); // Mover o scroll para o final
    }
  };

  // Mover o scroll para o final da lista de mensagens
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Mover o scroll sempre que uma nova mensagem for adicionada
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded shadow-lg w-2/4 h-3/4 flex flex-col">
        <div className="flex justify-between mb-4">
          <h2 className="text-lg font-bold">Chat</h2>
          {/* Botão de Fechar */}
          <button
            onClick={onClose}
            className="text-red-500 hover:text-red-700 font-bold"
          >
            Fechar
          </button>
        </div>

        <div className="flex flex-1 h-3/4">
          {/* Coluna da Esquerda: Lista de Usuários */}
          <div className="w-1/3 border-r pr-4 overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">Usuários</h2>
            <ul className="space-y-2">
              {users.map((userItem) => (
                <li
                  key={userItem.id}
                  className={`flex items-center cursor-pointer p-2 rounded ${
                    selectedUserId === userItem.id
                      ? "bg-blue-100"
                      : "hover:bg-gray-100"
                  }`}
                  onClick={() => handleSelectUser(userItem.id)}
                >
                  {/* Indicador de Status */}
                  <span
                    className={`w-3 h-3 rounded-full mr-2 ${
                      userItem.isOnline ? "bg-green-500" : "bg-gray-400"
                    }`}
                  ></span>
                  <span>{userItem.username}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Coluna da Direita: Mensagens */}
          <div className="w-2/3 pl-4 flex flex-col">
            <h2 className="text-lg font-bold mb-4">Mensagens</h2>
            <div className="flex-1 border p-4 rounded overflow-y-auto bg-gray-50">
              {selectedUserId ? (
                messages.map((msg, index) => (
                  <>
                    <div
                      key={index}
                      className={`p-2 rounded mb-2 break-words ${
                        msg.senderId === user.id || msg.userId === user.id
                          ? "bg-blue-500 text-white text-right"
                          : "bg-gray-300 text-left"
                      }`}
                    >
                      {msg.content}
                    </div>
                    {/* Referência para o final da lista */}
                    <div ref={messagesEndRef}></div>
                  </>
                ))
              ) : (
                <h1 className="text-lg text-center">
                  Selecione um colega para iniciar uma conversa! =D
                </h1>
              )}
            </div>

            {/* Campo de Envio */}
            {selectedUserId && (
              <div className="mt-4 flex">
                <input
                  type="text"
                  placeholder="Digite sua mensagem"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyDown={handleKeyDown} // Detectar Enter
                  className="flex-1 border px-4 py-2 rounded"
                />
                <button
                  onClick={handleSendMessage}
                  className="ml-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
                  disabled={!selectedUserId || !currentMessage}
                >
                  Enviar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatModal;
