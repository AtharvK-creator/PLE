export interface BenchmarkQuery {
  query_id: string;
  category: string;
  query: string;
  expectedRelevant: string[];
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}

export const EVALUATION_DATASET: BenchmarkQuery[] = [
  // 1. Prerequisite Discovery (Queries 1-7)
  {
    query_id: 'q01',
    category: 'Prerequisite Discovery',
    query: 'What do I need to know before learning dynamic memory allocation?',
    expectedRelevant: ['pointers', 'c-programming'],
    difficulty: 'MEDIUM',
  },
  {
    query_id: 'q02',
    category: 'Prerequisite Discovery',
    query: 'What prerequisites are required for linked lists?',
    expectedRelevant: ['pointers', 'c-programming'],
    difficulty: 'EASY',
  },
  {
    query_id: 'q03',
    category: 'Prerequisite Discovery',
    query: 'What concepts come before tree algorithms?',
    expectedRelevant: ['data-structures', 'linked-lists', 'pointers'],
    difficulty: 'HARD',
  },
  {
    query_id: 'q04',
    category: 'Prerequisite Discovery',
    query: 'How do pointers relate to array memory management?',
    expectedRelevant: ['pointers', 'c-programming'],
    difficulty: 'MEDIUM',
  },
  {
    query_id: 'q05',
    category: 'Prerequisite Discovery',
    query: 'What should I master prior to studying system architecture?',
    expectedRelevant: ['database-indexing', 'algorithms', 'data-structures'],
    difficulty: 'HARD',
  },
  {
    query_id: 'q06',
    category: 'Prerequisite Discovery',
    query: 'Prerequisites for learning hash tables and binary search trees?',
    expectedRelevant: ['data-structures', 'pointers'],
    difficulty: 'MEDIUM',
  },
  {
    query_id: 'q07',
    category: 'Prerequisite Discovery',
    query: 'What foundational knowledge is needed for memory leak debugging?',
    expectedRelevant: ['dynamic-memory', 'pointers'],
    difficulty: 'EASY',
  },

  // 2. Concept Similarity (Queries 8-13)
  {
    query_id: 'q08',
    category: 'Concept Similarity',
    query: 'Explain dynamic memory allocation malloc vs free',
    expectedRelevant: ['dynamic-memory', 'pointers'],
    difficulty: 'EASY',
  },
  {
    query_id: 'q09',
    category: 'Concept Similarity',
    query: 'How does pointer address arithmetic work in C?',
    expectedRelevant: ['pointers', 'c-programming'],
    difficulty: 'MEDIUM',
  },
  {
    query_id: 'q10',
    category: 'Concept Similarity',
    query: 'Comparison of B-Trees and Hash indexes for database queries',
    expectedRelevant: ['database-indexing', 'trees-graphs'],
    difficulty: 'HARD',
  },
  {
    query_id: 'q11',
    category: 'Concept Similarity',
    query: 'Explain Big-O time and space complexity of sorting algorithms',
    expectedRelevant: ['algorithms', 'data-structures'],
    difficulty: 'MEDIUM',
  },
  {
    query_id: 'q12',
    category: 'Concept Similarity',
    query: 'Memory heap vs stack allocation in procedural languages',
    expectedRelevant: ['dynamic-memory', 'pointers'],
    difficulty: 'MEDIUM',
  },
  {
    query_id: 'q13',
    category: 'Concept Similarity',
    query: 'Differences between singly linked list and doubly linked list',
    expectedRelevant: ['linked-lists', 'data-structures'],
    difficulty: 'EASY',
  },

  // 3. Related Concept Discovery (Queries 14-19)
  {
    query_id: 'q14',
    category: 'Related Concept Discovery',
    query: 'Find concepts related to graph traversal algorithms BFS and DFS',
    expectedRelevant: ['trees-graphs', 'algorithms', 'data-structures'],
    difficulty: 'MEDIUM',
  },
  {
    query_id: 'q15',
    category: 'Related Concept Discovery',
    query: 'What concepts are connected to database indexing performance?',
    expectedRelevant: ['database-indexing', 'system-architecture'],
    difficulty: 'HARD',
  },
  {
    query_id: 'q16',
    category: 'Related Concept Discovery',
    query: 'Concepts closely linked to C programming memory pointers',
    expectedRelevant: ['pointers', 'dynamic-memory', 'c-programming'],
    difficulty: 'EASY',
  },
  {
    query_id: 'q17',
    category: 'Related Concept Discovery',
    query: 'What topics connect algorithms to system architecture design?',
    expectedRelevant: ['algorithms', 'system-architecture', 'database-indexing'],
    difficulty: 'HARD',
  },
  {
    query_id: 'q18',
    category: 'Related Concept Discovery',
    query: 'Related topics for pointer dereferencing and null pointer exceptions',
    expectedRelevant: ['pointers', 'dynamic-memory'],
    difficulty: 'MEDIUM',
  },
  {
    query_id: 'q19',
    category: 'Related Concept Discovery',
    query: 'Topics related to binary trees and AVL trees',
    expectedRelevant: ['trees-graphs', 'data-structures'],
    difficulty: 'EASY',
  },

  // 4. Skill Recommendation (Queries 20-25)
  {
    query_id: 'q20',
    category: 'Skill Recommendation',
    query: 'Recommend skills for becoming a backend systems engineer',
    expectedRelevant: ['system-architecture', 'database-indexing', 'algorithms'],
    difficulty: 'HARD',
  },
  {
    query_id: 'q21',
    category: 'Skill Recommendation',
    query: 'What skills should I build for low-level memory programming?',
    expectedRelevant: ['pointers', 'dynamic-memory', 'c-programming'],
    difficulty: 'MEDIUM',
  },
  {
    query_id: 'q22',
    category: 'Skill Recommendation',
    query: 'Skills needed to master data structures and technical interviews',
    expectedRelevant: ['data-structures', 'algorithms', 'trees-graphs'],
    difficulty: 'MEDIUM',
  },
  {
    query_id: 'q23',
    category: 'Skill Recommendation',
    query: 'Which skill to pick next after basic C syntax?',
    expectedRelevant: ['pointers', 'dynamic-memory'],
    difficulty: 'EASY',
  },
  {
    query_id: 'q24',
    category: 'Skill Recommendation',
    query: 'Recommended skills for database optimization specialist',
    expectedRelevant: ['database-indexing', 'system-architecture'],
    difficulty: 'HARD',
  },
  {
    query_id: 'q25',
    category: 'Skill Recommendation',
    query: 'What skills help improve algorithmic problem solving efficiency?',
    expectedRelevant: ['algorithms', 'data-structures'],
    difficulty: 'MEDIUM',
  },

  // 5. Next-Learning Recommendation (Queries 26-31)
  {
    query_id: 'q26',
    category: 'Next-Learning Recommendation',
    query: 'I completed pointers, what should I learn next?',
    expectedRelevant: ['dynamic-memory', 'linked-lists'],
    difficulty: 'EASY',
  },
  {
    query_id: 'q27',
    category: 'Next-Learning Recommendation',
    query: 'I finished basic data structures, what is the next step?',
    expectedRelevant: ['trees-graphs', 'algorithms'],
    difficulty: 'MEDIUM',
  },
  {
    query_id: 'q28',
    category: 'Next-Learning Recommendation',
    query: 'What concept should I study after dynamic memory allocation?',
    expectedRelevant: ['linked-lists', 'data-structures'],
    difficulty: 'MEDIUM',
  },
  {
    query_id: 'q29',
    category: 'Next-Learning Recommendation',
    query: 'Next recommended topic after understanding array memory',
    expectedRelevant: ['pointers', 'dynamic-memory'],
    difficulty: 'EASY',
  },
  {
    query_id: 'q30',
    category: 'Next-Learning Recommendation',
    query: 'Suggest next advanced engineering concept after algorithms',
    expectedRelevant: ['database-indexing', 'system-architecture'],
    difficulty: 'HARD',
  },
  {
    query_id: 'q31',
    category: 'Next-Learning Recommendation',
    query: 'What topic follows linked list node operations?',
    expectedRelevant: ['trees-graphs', 'data-structures'],
    difficulty: 'EASY',
  },

  // 6. Weak-Area Recommendation (Queries 32-37)
  {
    query_id: 'q32',
    category: 'Weak-Area Recommendation',
    query: 'Why am I struggling with memory leak errors in my code?',
    expectedRelevant: ['dynamic-memory', 'pointers'],
    difficulty: 'MEDIUM',
  },
  {
    query_id: 'q33',
    category: 'Weak-Area Recommendation',
    query: 'How to overcome confusion between pointer values and addresses?',
    expectedRelevant: ['pointers', 'c-programming'],
    difficulty: 'EASY',
  },
  {
    query_id: 'q34',
    category: 'Weak-Area Recommendation',
    query: 'Help me fix low score on binary tree traversal quizzes',
    expectedRelevant: ['trees-graphs', 'data-structures'],
    difficulty: 'MEDIUM',
  },
  {
    query_id: 'q35',
    category: 'Weak-Area Recommendation',
    query: 'Why is my database query execution slow on large tables?',
    expectedRelevant: ['database-indexing', 'system-architecture'],
    difficulty: 'HARD',
  },
  {
    query_id: 'q36',
    category: 'Weak-Area Recommendation',
    query: 'I keep failing segmentation fault questions in C',
    expectedRelevant: ['pointers', 'dynamic-memory'],
    difficulty: 'MEDIUM',
  },
  {
    query_id: 'q37',
    category: 'Weak-Area Recommendation',
    query: 'Remedial learning path for recursion stack overflow issues',
    expectedRelevant: ['algorithms', 'trees-graphs'],
    difficulty: 'HARD',
  },

  // 7. Goal-Based Recommendation (Queries 38-43)
  {
    query_id: 'q38',
    category: 'Goal-Based Recommendation',
    query: 'Learning path for goal: Distributed Systems Engineer',
    expectedRelevant: ['system-architecture', 'database-indexing', 'algorithms'],
    difficulty: 'HARD',
  },
  {
    query_id: 'q39',
    category: 'Goal-Based Recommendation',
    query: 'Goal: Master C systems programming and memory management',
    expectedRelevant: ['c-programming', 'pointers', 'dynamic-memory'],
    difficulty: 'MEDIUM',
  },
  {
    query_id: 'q40',
    category: 'Goal-Based Recommendation',
    query: 'Goal: Pass FAANG Data Structures and Algorithms interview',
    expectedRelevant: ['data-structures', 'algorithms', 'trees-graphs'],
    difficulty: 'HARD',
  },
  {
    query_id: 'q41',
    category: 'Goal-Based Recommendation',
    query: 'Goal: Database Administrator and Indexing Architect',
    expectedRelevant: ['database-indexing', 'system-architecture'],
    difficulty: 'HARD',
  },
  {
    query_id: 'q42',
    category: 'Goal-Based Recommendation',
    query: 'Goal: Junior C Programmer fundamental mastery',
    expectedRelevant: ['c-programming', 'pointers'],
    difficulty: 'EASY',
  },
  {
    query_id: 'q43',
    category: 'Goal-Based Recommendation',
    query: 'Goal: Full Stack Engineer system optimization',
    expectedRelevant: ['system-architecture', 'database-indexing', 'algorithms'],
    difficulty: 'HARD',
  },

  // 8. General Educational Retrieval (Queries 44-50)
  {
    query_id: 'q44',
    category: 'General Educational Retrieval',
    query: 'What is a pointer in C programming?',
    expectedRelevant: ['pointers', 'c-programming'],
    difficulty: 'EASY',
  },
  {
    query_id: 'q45',
    category: 'General Educational Retrieval',
    query: 'How does malloc allocate memory on the heap?',
    expectedRelevant: ['dynamic-memory', 'pointers'],
    difficulty: 'MEDIUM',
  },
  {
    query_id: 'q46',
    category: 'General Educational Retrieval',
    query: 'Explain how B-Tree indexes improve database query speed',
    expectedRelevant: ['database-indexing', 'trees-graphs'],
    difficulty: 'MEDIUM',
  },
  {
    query_id: 'q47',
    category: 'General Educational Retrieval',
    query: 'What is the time complexity of quicksort and mergesort?',
    expectedRelevant: ['algorithms', 'data-structures'],
    difficulty: 'MEDIUM',
  },
  {
    query_id: 'q48',
    category: 'General Educational Retrieval',
    query: 'Definition and structure of a singly linked list',
    expectedRelevant: ['linked-lists', 'pointers'],
    difficulty: 'EASY',
  },
  {
    query_id: 'q49',
    category: 'General Educational Retrieval',
    query: 'How does load balancing work in modern system architecture?',
    expectedRelevant: ['system-architecture', 'database-indexing'],
    difficulty: 'HARD',
  },
  {
    query_id: 'q50',
    category: 'General Educational Retrieval',
    query: 'Explain memory leaks and how to avoid them with free',
    expectedRelevant: ['dynamic-memory', 'pointers'],
    difficulty: 'EASY',
  },
];
