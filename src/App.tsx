import SqlEditor from "./SqlEditor";

function App() {
  return (
    <div className="min-h-screen bg-white p-6">
      <h1 className="text-3xl font-bold text-blue-600 mb-4 underline">
        SQL Practice App
      </h1>
      <SqlEditor />
    </div>
  );
}

export default App;
