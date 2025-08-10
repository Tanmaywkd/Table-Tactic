// ✅ Exported interface
export interface Question {
  id: number;
  title: string;
  setupSQL: string;
  starterSQL: string;
  expectedOutput: any[];
  solution?: string;
}

// ✅ Exported questions array
export const questions: Question[] = [
  {
    id: 1,
    title: "Select all users",
    setupSQL: `
      CREATE TABLE users (id INTEGER, name TEXT);
      INSERT INTO users VALUES (1, 'Alice'), (2, 'Bob'), (3, 'Charlie');
    `,
    starterSQL: "SELECT * FROM users;",
    expectedOutput: [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
      { id: 3, name: "Charlie" }
    ],
    solution: "SELECT * FROM users;"
  }
];
