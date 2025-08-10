import React, { useEffect, useRef, useState, useMemo } from "react";
import Editor, { useMonaco } from "@monaco-editor/react";
import {
  ThemeProvider,
  createTheme
} from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Drawer from "@mui/material/Drawer";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import PlaylistPlayIcon from "@mui/icons-material/PlaylistPlay";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import CloseIcon from "@mui/icons-material/Close";
import TableChartIcon from "@mui/icons-material/TableChart";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";

export default function SqlEditor() {
  const monaco = useMonaco();
  const [themeMode, setThemeMode] = useState(localStorage.getItem("themeMode") || "light");

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: themeMode as "light" | "dark",
          background: {
            default: themeMode === "light" ? "#f4f1ed" : "#2e3440", // warm soft background
            paper: themeMode === "light" ? "#f9f7f4" : "#3b4252", // slightly lighter for cards
          },
          text: {
            primary: themeMode === "light" ? "#2e3436" : "#d8dee9",
            secondary: themeMode === "light" ? "#4f5b66" : "#88c0d0",
          },
          primary: {
            main: themeMode === "light" ? "#5e81ac" : "#81a1c1",
          },
        },
        typography: {
          fontFamily: '"Roboto Mono", monospace',
          body1: { fontSize: "0.95rem" },
          body2: { fontSize: "0.85rem" },
          h6: { fontWeight: 600 },
        },
      }),
    [themeMode]
  );

  const toggleTheme = () => {
    const next = themeMode === "light" ? "dark" : "light";
    setThemeMode(next);
    localStorage.setItem("themeMode", next);
  };

  useEffect(() => {
    if (!monaco) return;
    // Softer, warm colors for light theme
    monaco.editor.defineTheme("mt-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "", foreground: "2e3436" },
        { token: "keyword", foreground: "5e81ac", fontStyle: "bold" },
        { token: "number", foreground: "bf616a" },
        { token: "string", foreground: "a3be8c" },
      ],
      colors: {
        "editor.background": "#f9f7f4", // matches paper, just a bit off from default
        "editor.foreground": "#2e3436",
      },
    });
    // Dark mode remains smooth nord-like
    monaco.editor.defineTheme("mt-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "", foreground: "d8dee9" },
        { token: "keyword", foreground: "88c0d0", fontStyle: "bold" },
        { token: "number", foreground: "bf616a" },
        { token: "string", foreground: "a3be8c" },
      ],
      colors: {
        "editor.background": "#323846",
        "editor.foreground": "#d8dee9",
      },
    });
  }, [monaco]);

  const [databases, setDatabases] = useState<{ file: string; name: string }[]>([]);
  const [selectedDb, setSelectedDb] = useState("");
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [code, setCode] = useState("");
  const [outputMessage, setOutputMessage] = useState("");
  const [messageColor, setMessageColor] = useState("black");
  const [expectedData, setExpectedData] = useState<any[] | null>(null);
  const [receivedData, setReceivedData] = useState<any[] | null>(null);
  const [dbTables, setDbTables] = useState<Record<string, any[]> | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [showTables, setShowTables] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  const [timer, setTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("http://localhost:5000/api/databases")
      .then((res) => res.json())
      .then(setDatabases)
      .catch(console.error);
  }, []);

  const handleDbChange = async (dbFile: string) => {
    setSelectedDb(dbFile);
    setShowAnswer(false);
    setOutputMessage("");
    if (!dbFile) {
      setQuestions([]);
      setCode("");
      setDbTables(null);
      return;
    }
    try {
      const qRes = await fetch(`http://localhost:5000/api/questions/${dbFile}`);
      const qData = await qRes.json();
      setQuestions(qData);
      const tRes = await fetch(`http://localhost:5000/api/db-tables/${dbFile}`);
      const tData = await tRes.json();
      setDbTables(tData);
      if (qData.length > 0) {
        setCurrentIndex(0);
        setCode(qData[0].starterCode || "");
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (questions.length > 0) {
      setTimer(0);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => setTimer((prev) => prev + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, questions]);

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const formatTime = (seconds: number) =>
    `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  const saveTimeToBackend = async (dbName: string, questionId: number, time: number) => {
    await fetch(`http://localhost:5000/api/save-time`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dbName, questionId, timeTaken: time }),
    });
  };

  const runCode = async () => {
    if (!selectedDb || !code.trim() || questions.length === 0) return;
    try {
      const res = await fetch(`http://localhost:5000/api/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dbName: selectedDb,
          questionId: questions[currentIndex].id,
          userQuery: code,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setOutputMessage(`❌ Error: ${data.error}`);
        setMessageColor("red");
        setExpectedData(null);
        setReceivedData(null);
      } else {
        if (data.correct) {
          stopTimer();
          setOutputMessage("✅ You got it correct!");
          setMessageColor("green");
          const updated = [...questions];
          updated[currentIndex].timeTaken = timer;
          setQuestions(updated);
          await saveTimeToBackend(selectedDb, questions[currentIndex].id, timer);
        } else {
          setOutputMessage("❌ Incorrect solution");
          setMessageColor("red");
        }
        setExpectedData(data.expected || []);
        setReceivedData(data.received || []);
      }
    } catch (err) {
      setOutputMessage(`❌ Error: ${(err as Error).message}`);
      setMessageColor("red");
    }
  };

  const goPrev = () => {
    setCurrentIndex((prev) => {
      const newIndex = (prev - 1 + questions.length) % questions.length;
      setCode(questions[newIndex].starterCode || "");
      setShowAnswer(false);
      setOutputMessage("");
      return newIndex;
    });
  };

  const goNext = () => {
    setCurrentIndex((prev) => {
      const newIndex = (prev + 1) % questions.length;
      setCode(questions[newIndex].starterCode || "");
      setShowAnswer(false);
      setOutputMessage("");
      return newIndex;
    });
  };

  const selectQuestion = (index: number) => {
    setCurrentIndex(index);
    setCode(questions[index].starterCode || "");
    setShowAnswer(false);
    setOutputMessage("");
    setShowPanel(false);
  };

  const renderTable = (data: any[]) => {
    if (!data || data.length === 0) return <Typography>No data</Typography>;
    return (
      <TableContainer component={Paper} sx={{ mt: 1, display: "inline-block", width: "auto", mr: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {Object.keys(data[0]).map((col) => (
                <TableCell key={col} sx={{ fontWeight: "bold" }}>
                  {col}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row, i) => (
              <TableRow key={i}>
                {Object.values(row).map((val, j) => (
                  <TableCell key={j}>{String(val)}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
        <AppBar position="static" color="primary">
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              SQL Practice
            </Typography>
            <IconButton color="inherit" onClick={toggleTheme}>
              {themeMode === "light" ? <Brightness4Icon /> : <Brightness7Icon />}
            </IconButton>
            {questions.length > 0 && (
              <Typography variant="body1" sx={{ mr: 2 }}>
                ⏱ Time: {formatTime(timer)}
              </Typography>
            )}
            <FormControl variant="standard" sx={{ minWidth: 220, mr: 2 }}>
              <InputLabel>Database</InputLabel>
              <Select value={selectedDb} onChange={(e) => handleDbChange(e.target.value)}>
                <MenuItem value="">
                  <em>-- Select Database --</em>
                </MenuItem>
                {databases.map((db, idx) => (
                  <MenuItem key={idx} value={db.file}>
                    {db.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <IconButton color="inherit" onClick={goPrev}>
              <ArrowBackIcon />
            </IconButton>
            <IconButton color="inherit" onClick={goNext}>
              <ArrowForwardIcon />
            </IconButton>
            <IconButton color="inherit" onClick={() => setShowPanel(true)}>
              <PlaylistPlayIcon />
            </IconButton>
            <IconButton color="inherit" onClick={() => setShowTables(true)}>
              <TableChartIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg" sx={{ py: 3 }}>
          {questions.length > 0 && (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", mb: 2 }}>
              <Button onClick={goPrev} startIcon={<ArrowBackIcon />}>
                Prev
              </Button>
              <Box sx={{ textAlign: "center", mx: 2 }}>
                <Typography variant="h6">{questions[currentIndex].title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {questions[currentIndex].description}
                </Typography>
              </Box>
              <Button onClick={goNext} endIcon={<ArrowForwardIcon />}>
                Next
              </Button>
            </Box>
          )}

          <Box
            sx={{
              borderRadius: 2,
              boxShadow: 1,
              overflow: "hidden",
              bgcolor: themeMode === "light" ? "#f9f7f4" : "#323846",
              transition: "background-color 0.3s ease",
            }}
          >
            <Editor
              height="320px"
              defaultLanguage="sql"
              value={code}
              onChange={(value) => setCode(value || "")}
              theme={themeMode === "dark" ? "mt-dark" : "mt-light"}
              options={{
                fontFamily: '"Roboto Mono", monospace',
                fontSize: 15,
                minimap: { enabled: false },
              }}
            />
          </Box>

          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={runCode}>
              Run
            </Button>
            <Button variant="outlined" onClick={() => setShowAnswer((p) => !p)}>
              {showAnswer ? "Hide Answer" : "Show Answer"}
            </Button>
          </Stack>

          {showAnswer && (
            <Box sx={{ mt: 2, bgcolor: "background.paper", p: 2, borderRadius: 1 }}>
              <Typography variant="subtitle2">Correct SQL:</Typography>
              <pre style={{ whiteSpace: "pre-wrap", marginTop: 8, fontFamily: '"Roboto Mono", monospace' }}>
                {questions[currentIndex]?.solution}
              </pre>
            </Box>
          )}

          <Box sx={{ mt: 3 }}>
            <Typography variant="h6">Output:</Typography>
            {outputMessage && (
              <Typography sx={{ color: messageColor === "green" ? "success.main" : "error.main", fontWeight: "bold", mt: 1 }}>
                {outputMessage}
              </Typography>
            )}
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mt: 2 }}>
              <Box>
                <Typography variant="subtitle1">Expected Result</Typography>
                {expectedData ? renderTable(expectedData) : <p>No expected data</p>}
              </Box>
              <Box>
                <Typography variant="subtitle1">Your Result</Typography>
                {receivedData ? renderTable(receivedData) : <p>No received data</p>}
              </Box>
            </Box>
          </Box>
        </Container>

        <Drawer anchor="right" open={showPanel} onClose={() => setShowPanel(false)}>
          <Box sx={{ width: 320, p: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
              <Typography variant="h6">Question List</Typography>
              <IconButton onClick={() => setShowPanel(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
            <Divider />
            <List>
              {questions.map((q, index) => (
                <ListItem button key={q.id} selected={index === currentIndex} onClick={() => selectQuestion(index)}>
                  <ListItemText
                    primary={q.title}
                    secondary={q.timeTaken !== undefined ? `⏱ ${formatTime(q.timeTaken)}` : null}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        </Drawer>

        <Drawer anchor="bottom" open={showTables} onClose={() => setShowTables(false)}>
          <Box sx={{ width: "100%", p: 2, maxHeight: "50vh", overflowY: "auto" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
              <Typography variant="subtitle1">📄 Database Tables</Typography>
              <IconButton onClick={() => setShowTables(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
            <Divider sx={{ mb: 2 }} />
            {dbTables &&
              Object.entries(dbTables).map(([name, rows]) => (
                <Box key={name} sx={{ mb: 2, display: "inline-block", mr: 3 }}>
                  <Typography variant="subtitle2">{name}</Typography>
                  {rows.length > 0 ? renderTable(rows) : <p>No data</p>}
                </Box>
              ))}
          </Box>
        </Drawer>
      </Box>
    </ThemeProvider>
  );
}

