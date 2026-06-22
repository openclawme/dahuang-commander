import { CommanderProvider } from "./context/CommanderContext";
import Dashboard from "./components/Dashboard";
import "./App.css";

function App() {
  return (
    <CommanderProvider>
      <Dashboard />
    </CommanderProvider>
  );
}

export default App;
