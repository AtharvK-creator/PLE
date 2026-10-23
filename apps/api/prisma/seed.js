"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
// Inline slugify — avoids circular dependency with packages/shared
function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
var FEATURE_FLAGS = [
    {
        name: 'aiTutor',
        enabled: true,
        description: 'Enable the AI Tutor chat interface powered by Gemini 2.5 Flash.',
    },
    {
        name: 'roadmap',
        enabled: true,
        description: 'Enable AI-generated personalized learning roadmaps.',
    },
    {
        name: 'quizzes',
        enabled: true,
        description: 'Enable AI-generated adaptive quizzes powered by Gemini 2.5 Flash-Lite.',
    },
    {
        name: 'dashboard',
        enabled: true,
        description: 'Enable the student analytics dashboard with progress tracking.',
    },
    {
        name: 'vectorSearch',
        enabled: false,
        description: 'Enable pgvector-powered semantic search across learning content. Requires vector extension.',
    },
    {
        name: 'googleOAuth',
        enabled: true,
        description: 'Enable Google OAuth sign-in flow.',
    },
    {
        name: 'emailVerification',
        enabled: true,
        description: 'Require email verification on signup.',
    },
];
function seedFeatureFlags() {
    return __awaiter(this, void 0, void 0, function () {
        var _i, FEATURE_FLAGS_1, flag;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('🚩 Seeding feature flags...');
                    _i = 0, FEATURE_FLAGS_1 = FEATURE_FLAGS;
                    _a.label = 1;
                case 1:
                    if (!(_i < FEATURE_FLAGS_1.length)) return [3 /*break*/, 4];
                    flag = FEATURE_FLAGS_1[_i];
                    return [4 /*yield*/, prisma.featureFlag.upsert({
                            where: { name: flag.name },
                            update: {
                                enabled: flag.enabled,
                                description: flag.description,
                            },
                            create: {
                                name: flag.name,
                                enabled: flag.enabled,
                                description: flag.description,
                            },
                        })];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    console.log("   \u2713 Seeded ".concat(FEATURE_FLAGS.length, " feature flags"));
                    return [2 /*return*/];
            }
        });
    });
}
var SKILLS = [
    // ── Programming Languages ──────────────────────────────────────────────────
    {
        name: 'Python',
        category: 'Programming Languages',
        description: 'General-purpose, high-level language widely used in data science, AI/ML, scripting, and web backends.',
    },
    {
        name: 'JavaScript',
        category: 'Programming Languages',
        description: 'The language of the web; runs in browsers and on servers (Node.js) for full-stack development.',
    },
    {
        name: 'TypeScript',
        category: 'Programming Languages',
        description: 'Strongly typed superset of JavaScript that compiles to plain JS; improves developer productivity at scale.',
    },
    {
        name: 'Java',
        category: 'Programming Languages',
        description: 'Object-oriented, platform-independent language widely used in enterprise backends, Android, and Spring ecosystem.',
    },
    {
        name: 'C++',
        category: 'Programming Languages',
        description: 'High-performance systems language with fine-grained memory control; used in game engines, embedded systems, and competitive programming.',
    },
    {
        name: 'Go',
        category: 'Programming Languages',
        description: 'Compiled, statically typed language from Google designed for concurrency, microservices, and cloud-native tooling.',
    },
    {
        name: 'Rust',
        category: 'Programming Languages',
        description: 'Memory-safe systems language without a garbage collector; ideal for WebAssembly, OS-level, and performance-critical code.',
    },
    {
        name: 'C',
        category: 'Programming Languages',
        description: 'Low-level procedural language forming the foundation of operating systems, compilers, and embedded firmware.',
    },
    {
        name: 'Kotlin',
        category: 'Programming Languages',
        description: 'Modern JVM language fully interoperable with Java; primary language for Android development and backend with Ktor.',
    },
    // ── Web Development ────────────────────────────────────────────────────────
    {
        name: 'React',
        category: 'Web Development',
        description: 'Declarative, component-based JavaScript library for building interactive UIs with a virtual DOM.',
    },
    {
        name: 'Next.js',
        category: 'Web Development',
        description: 'React meta-framework with App Router, server components, SSR, SSG, and built-in API routes for full-stack apps.',
    },
    {
        name: 'Node.js',
        category: 'Web Development',
        description: "Asynchronous JavaScript runtime built on Chrome's V8 engine for building scalable server-side applications.",
    },
    {
        name: 'Express.js',
        category: 'Web Development',
        description: 'Minimal and flexible Node.js web framework providing routing, middleware, and HTTP utilities.',
    },
    {
        name: 'NestJS',
        category: 'Web Development',
        description: 'Progressive Node.js framework built with TypeScript; provides modules, dependency injection, and decorators for enterprise APIs.',
    },
    {
        name: 'HTML/CSS',
        category: 'Web Development',
        description: 'Foundational markup and styling languages for structuring and visually designing web pages.',
    },
    {
        name: 'REST APIs',
        category: 'Web Development',
        description: 'Architectural style for designing stateless HTTP APIs following resource-based conventions.',
    },
    {
        name: 'GraphQL',
        category: 'Web Development',
        description: 'Query language and runtime for APIs that enables clients to request exactly the data they need.',
    },
    {
        name: 'Tailwind CSS',
        category: 'Web Development',
        description: 'Utility-first CSS framework for rapidly building custom user interfaces without leaving HTML.',
    },
    // ── Data Science & ML ──────────────────────────────────────────────────────
    {
        name: 'Machine Learning',
        category: 'Data Science & ML',
        description: 'Field of AI focused on building systems that learn from data using statistical and optimization techniques.',
    },
    {
        name: 'Deep Learning',
        category: 'Data Science & ML',
        description: 'Subset of ML using multi-layer neural networks to model complex patterns in vision, NLP, and speech.',
    },
    {
        name: 'Data Analysis',
        category: 'Data Science & ML',
        description: 'Process of inspecting, cleaning, transforming, and modelling data to discover useful information and insights.',
    },
    {
        name: 'NumPy',
        category: 'Data Science & ML',
        description: 'Foundational Python library for numerical computing with efficient multi-dimensional arrays and mathematical functions.',
    },
    {
        name: 'Pandas',
        category: 'Data Science & ML',
        description: 'Python library providing DataFrame abstractions for data manipulation, aggregation, and analysis.',
    },
    {
        name: 'TensorFlow',
        category: 'Data Science & ML',
        description: "Google's open-source ML platform for building, training, and deploying deep learning models at scale.",
    },
    {
        name: 'PyTorch',
        category: 'Data Science & ML',
        description: "Meta's dynamic computation graph ML framework favored in research and production NLP/CV pipelines.",
    },
    {
        name: 'Scikit-learn',
        category: 'Data Science & ML',
        description: 'Python library providing classical ML algorithms, model selection utilities, and preprocessing tools.',
    },
    // ── DevOps & Cloud ─────────────────────────────────────────────────────────
    {
        name: 'Docker',
        category: 'DevOps & Cloud',
        description: 'Container platform for packaging applications and their dependencies into portable, reproducible images.',
    },
    {
        name: 'Kubernetes',
        category: 'DevOps & Cloud',
        description: 'Open-source container orchestration system for automating deployment, scaling, and management of containerised apps.',
    },
    {
        name: 'CI/CD',
        category: 'DevOps & Cloud',
        description: 'Practices and tooling (GitHub Actions, GitLab CI, Jenkins) for automating build, test, and deployment pipelines.',
    },
    {
        name: 'AWS',
        category: 'DevOps & Cloud',
        description: "Amazon's comprehensive cloud platform offering compute, storage, networking, and managed services globally.",
    },
    {
        name: 'Git',
        category: 'DevOps & Cloud',
        description: 'Distributed version control system for tracking source code history, branching, and collaborative development.',
    },
    {
        name: 'Linux',
        category: 'DevOps & Cloud',
        description: 'Open-source OS kernel; proficiency in shell scripting, process management, and system administration is essential for backend/DevOps.',
    },
    {
        name: 'Terraform',
        category: 'DevOps & Cloud',
        description: 'Infrastructure-as-Code tool for provisioning and managing cloud resources declaratively across multiple providers.',
    },
    // ── Databases ──────────────────────────────────────────────────────────────
    {
        name: 'PostgreSQL',
        category: 'Databases',
        description: 'Advanced open-source relational database with ACID compliance, JSONB, full-text search, and pgvector support.',
    },
    {
        name: 'MongoDB',
        category: 'Databases',
        description: 'Document-oriented NoSQL database that stores flexible JSON-like BSON documents for scalable applications.',
    },
    {
        name: 'Redis',
        category: 'Databases',
        description: 'In-memory data structure store used as a cache, message broker, and session store with microsecond latency.',
    },
    {
        name: 'SQL',
        category: 'Databases',
        description: 'Standard language for querying and manipulating relational databases; covers DDL, DML, joins, and aggregations.',
    },
    {
        name: 'Prisma',
        category: 'Databases',
        description: 'Type-safe ORM for Node.js and TypeScript with schema-first design, migrations, and a powerful query API.',
    },
    // ── System Design ──────────────────────────────────────────────────────────
    {
        name: 'Microservices',
        category: 'System Design',
        description: 'Architectural pattern of building applications as small, independently deployable services communicating over APIs.',
    },
    {
        name: 'API Design',
        category: 'System Design',
        description: 'Principles and best practices for designing intuitive, versioned, and well-documented APIs (REST, gRPC, GraphQL).',
    },
    {
        name: 'System Design',
        category: 'System Design',
        description: 'High-level architectural planning for scalable, fault-tolerant distributed systems covering CAP, load balancing, caching, and more.',
    },
    {
        name: 'Message Queues',
        category: 'System Design',
        description: 'Asynchronous communication via brokers (RabbitMQ, Kafka) to decouple services and handle high-throughput event streams.',
    },
    // ── Core CS ────────────────────────────────────────────────────────────────
    {
        name: 'Data Structures',
        category: 'Core CS',
        description: 'Fundamental ways of organising data (arrays, trees, graphs, hash maps) for efficient access and modification.',
    },
    {
        name: 'Algorithms',
        category: 'Core CS',
        description: 'Step-by-step computational procedures including sorting, searching, dynamic programming, and graph traversal.',
    },
    {
        name: 'Operating Systems',
        category: 'Core CS',
        description: 'Study of process scheduling, memory management, file systems, concurrency, and kernel internals.',
    },
    {
        name: 'Computer Networks',
        category: 'Core CS',
        description: 'Fundamentals of networking including TCP/IP, HTTP/S, DNS, routing, and socket programming.',
    },
    {
        name: 'Object-Oriented Programming',
        category: 'Core CS',
        description: 'Paradigm organising software around objects and classes with encapsulation, inheritance, and polymorphism.',
    },
    {
        name: 'Functional Programming',
        category: 'Core CS',
        description: 'Paradigm treating computation as evaluation of pure functions, emphasising immutability and higher-order functions.',
    },
];
function seedSkills() {
    return __awaiter(this, void 0, void 0, function () {
        var created, updated, _i, SKILLS_1, skill, slug, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('🛠️  Seeding skill catalog...');
                    created = 0;
                    updated = 0;
                    _i = 0, SKILLS_1 = SKILLS;
                    _a.label = 1;
                case 1:
                    if (!(_i < SKILLS_1.length)) return [3 /*break*/, 4];
                    skill = SKILLS_1[_i];
                    slug = slugify(skill.name);
                    return [4 /*yield*/, prisma.skill.upsert({
                            where: { slug: slug },
                            update: {
                                name: skill.name,
                                category: skill.category,
                                description: skill.description,
                            },
                            create: {
                                name: skill.name,
                                slug: slug,
                                category: skill.category,
                                description: skill.description,
                            },
                        })];
                case 2:
                    result = _a.sent();
                    // upsert returns the record; we can't easily tell create vs update without extra queries
                    // so we just count — in practice both paths are idempotent
                    void result;
                    created++;
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    console.log("   \u2713 Upserted ".concat(created, " skills across ").concat(new Set(SKILLS.map(function (s) { return s.category; })).size, " categories"));
                    return [2 /*return*/];
            }
        });
    });
}
// ============================================
// MAIN
// ============================================
function main() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('\n🌱 Starting PLE database seed...\n');
                    return [4 /*yield*/, seedFeatureFlags()];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, seedSkills()];
                case 2:
                    _a.sent();
                    console.log('\n✅ Seed completed successfully.\n');
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
})
    .finally(function () {
    void prisma.$disconnect();
});
