import React, { useState, useEffect, useRef } from "react";
import LoginModal from "./components/LoginModal";
import RegisterModal from "./components/RegisterModal";
import ChatModal from "./components/ChatModal";

const App: React.FC = () => {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [user, setUser] = useState<{ id: number; username: string } | null>(
    null
  );
  const socket = useRef<WebSocket | null>(null);

  // Restaurar o estado do usuário ao carregar a página
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser)); // Restaurar usuário do localStorage
    }
  }, []);

  // Conectar ao WebSocket quando o usuário estiver logado
  useEffect(() => {
    if (user) {
      socket.current = new WebSocket("ws://localhost:8080");

      socket.current.onopen = () => {
        console.log("WebSocket conectado");

        // Informar ao backend que o usuário está online
        socket.current?.send(
          JSON.stringify({
            type: "online",
            userId: user.id,
          })
        );
      };

      socket.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("Mensagem do WebSocket:", data);
      };

      socket.current.onclose = () => {
        console.log("WebSocket desconectado");
      };

      return () => {
        socket.current?.close(); // Fechar conexão ao desmontar
      };
    }
  }, [user]);

  const handleLogout = async () => {
    if (!user) return;

    try {
      await fetch("http://localhost:3000/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });

      localStorage.removeItem("user"); // Remover do localStorage
      setUser(null);
      socket.current?.close(); // Fechar WebSocket ao fazer logout
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <header className="bg-blue-600 text-white py-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center px-4">
          <h1 className="text-lg font-bold">Chat App</h1>
          <div className="flex space-x-4">
            {user ? (
              <>
                <span>Bem-vindo, {user.username}</span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-600 rounded hover:bg-red-500"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsLoginOpen(true)}
                  className="px-4 py-2 bg-blue-800 rounded hover:bg-blue-700"
                >
                  Login
                </button>
                <button
                  onClick={() => setIsRegisterOpen(true)}
                  className="px-4 py-2 bg-green-600 rounded hover:bg-green-500"
                >
                  Cadastre-se
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto mt-10 px-4">
        <h2 className="text-xl font-semibold">Bem-vindo ao Chat App!</h2>
        <p>Faça login ou cadastre-se para começar a conversar.</p>
      </main>

      {/* Chat Button */}
      {user && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-full shadow-md hover:bg-blue-500"
        >
          Abrir Chat
        </button>
      )}

      {/* Modais */}
      {isLoginOpen && (
        <LoginModal
          onClose={() => setIsLoginOpen(false)}
          onLogin={(userData) => {
            setUser(userData);
            localStorage.setItem("user", JSON.stringify(userData)); // Guardar no localStorage
            setIsLoginOpen(false);
          }}
        />
      )}
      {isRegisterOpen && (
        <RegisterModal onClose={() => setIsRegisterOpen(false)} />
      )}
      {isChatOpen && (
        <ChatModal
          onClose={() => setIsChatOpen(false)}
          user={user!}
          socket={socket.current}
        />
      )}
    </div>
  );
};

export default App;
