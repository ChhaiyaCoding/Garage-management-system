// ─── Mock data for Garage OS ───
// Realistic Cambodian customers, plates, parts. Prices in USD with KHR convertible (4100 KHR/USD).

const GARAGE = (function () {
  const customers = [
    {
      id: "CU-1001",
      name: "Chea Vannak",
      initials: "CV",
      color: "#0fbfa1",
      type: "personal",
      phone: "+855 12 345 678",
      telegram: true,
      address: "ភ្នំពេញ · ខណ្ឌចំការមន",
      since: "2023-03-12",
      tags: ["VIP", "LOYALTY"],
      points: 320,
      vehicles: ["VE-2001", "VE-2002"],
      lifetime: 1180,
      jobs: 4,
    },
    {
      id: "CU-1002",
      name: "Sokimex Fleet",
      initials: "SF",
      color: "#14b8a6",
      type: "corporate",
      phone: "+855 23 999 111",
      telegram: false,
      address: "ទំនាក់ទំនង · លោក Sok Vibol",
      since: "2022-08-05",
      tags: ["CORPORATE", "CONTRACT SLA"],
      points: 0,
      terms: "Net 30 days",
      vehicles: ["VE-2003", "VE-2004", "VE-2005"],
      lifetime: 18450,
      jobs: 17,
    },
    {
      id: "CU-1003",
      name: "Som Pisey",
      initials: "SP",
      color: "#22c55e",
      type: "personal",
      phone: "+855 96 778 991",
      telegram: true,
      address: "ភ្នំពេញ · ខណ្ឌទួលគោក",
      since: "2024-07-08",
      tags: ["ACTIVE"],
      points: 85,
      vehicles: ["VE-2006"],
      lifetime: 890,
      jobs: 3,
    },
    {
      id: "CU-1004",
      name: "Lim Sothy",
      initials: "LS",
      color: "#f5b400",
      type: "personal",
      phone: "+855 17 232 008",
      telegram: true,
      address: "ភ្នំពេញ · ខណ្ឌសែនសុខ",
      since: "2023-11-19",
      tags: ["LOYALTY"],
      points: 142,
      vehicles: ["VE-2007"],
      lifetime: 740,
      jobs: 5,
    },
    {
      id: "CU-1005",
      name: "Pich Sokha",
      initials: "PS",
      color: "#a78bfa",
      type: "personal",
      phone: "+855 92 119 220",
      telegram: false,
      address: "ខេត្តកណ្ដាល · តាខ្មៅ",
      since: "2024-01-22",
      tags: ["NEW"],
      points: 40,
      vehicles: ["VE-2008"],
      lifetime: 320,
      jobs: 2,
    },
    {
      id: "CU-1006",
      name: "Hor Channa",
      initials: "HC",
      color: "#38bdf8",
      type: "personal",
      phone: "+855 10 545 313",
      telegram: true,
      address: "ភ្នំពេញ · ខណ្ឌដូនពេញ",
      since: "2022-06-30",
      tags: ["VIP"],
      points: 580,
      vehicles: ["VE-2009"],
      lifetime: 2680,
      jobs: 11,
    },
    {
      id: "CU-1007",
      name: "Yim Phally",
      initials: "YP",
      color: "#f472b6",
      type: "personal",
      phone: "+855 89 700 121",
      telegram: false,
      address: "ភ្នំពេញ · ខណ្ឌចំការមន",
      since: "2025-02-14",
      tags: ["NEW"],
      points: 12,
      vehicles: ["VE-2010"],
      lifetime: 120,
      jobs: 1,
    },
    {
      id: "CU-1008",
      name: "ABA Bank · Fleet",
      initials: "AB",
      color: "#fb923c",
      type: "corporate",
      phone: "+855 23 225 333",
      telegram: false,
      address: "ទំនាក់ទំនង · លោកស្រី Nary",
      since: "2021-04-18",
      tags: ["CORPORATE", "CONTRACT SLA"],
      points: 0,
      terms: "Net 45 days",
      vehicles: ["VE-2011", "VE-2012", "VE-2013"],
      lifetime: 26900,
      jobs: 28,
    },
  ];

  const vehicles = [
    { id: "VE-2001", plate: "2KA-3917", make: "Lexus", model: "RX350", year: 2019, vin: "JTJBM7FX1K5021391", color: "ស្វាយ", mileage: 78420, lastService: "2026-03-04", nextService: "2026-06-04", owner: "CU-1001", status: "due" },
    { id: "VE-2002", plate: "2BA-5028", make: "Toyota", model: "Highlander", year: 2021, vin: "5TDDZRFH8MS073921", color: "ស", mileage: 42180, lastService: "2026-04-12", nextService: "2026-07-12", owner: "CU-1001", status: "ok" },
    { id: "VE-2003", plate: "1AA-2201", make: "Hyundai", model: "Tucson", year: 2022, vin: "KM8J3CA46NU093456", color: "ខ្មៅ", mileage: 31250, lastService: "2026-04-30", nextService: "2026-07-30", owner: "CU-1002", status: "ok" },
    { id: "VE-2004", plate: "1AA-2202", make: "Toyota", model: "Camry", year: 2020, vin: "4T1G11AK0LU886631", color: "ប្រាក់", mileage: 64210, lastService: "2026-02-22", nextService: "2026-05-22", owner: "CU-1002", status: "due" },
    { id: "VE-2005", plate: "1AA-2203", make: "Ford", model: "Ranger XLT", year: 2023, vin: "MNCBSF40RPW012988", color: "ខ្មៅ", mileage: 22980, lastService: "2026-05-01", nextService: "2026-08-01", owner: "CU-1002", status: "ok" },
    { id: "VE-2006", plate: "2BB-1180", make: "Honda", model: "CR-V", year: 2018, vin: "2HKRW2H59JH605211", color: "ស", mileage: 96320, lastService: "2026-03-22", nextService: "2026-06-22", owner: "CU-1003", status: "ok" },
    { id: "VE-2007", plate: "2CA-7700", make: "Mitsubishi", model: "Triton", year: 2019, vin: "MMBJNKB40KH001234", color: "ខៀវ", mileage: 88110, lastService: "2026-04-09", nextService: "2026-07-09", owner: "CU-1004", status: "ok" },
    { id: "VE-2008", plate: "2KA-1010", make: "Nissan", model: "Navara", year: 2020, vin: "MNTBJ1NDPLT701822", color: "ប្រាក់", mileage: 70410, lastService: "2026-01-14", nextService: "2026-04-14", owner: "CU-1005", status: "overdue" },
    { id: "VE-2009", plate: "2BA-9090", make: "Lexus", model: "LX570", year: 2017, vin: "JTJHY00W574096120", color: "ខ្មៅ", mileage: 110200, lastService: "2026-04-22", nextService: "2026-07-22", owner: "CU-1006", status: "ok" },
    { id: "VE-2010", plate: "2KA-8842", make: "Kia", model: "Sorento", year: 2022, vin: "KNDPM3AC2N7193322", color: "ស", mileage: 28210, lastService: "2026-05-10", nextService: "2026-08-10", owner: "CU-1007", status: "ok" },
    { id: "VE-2011", plate: "1AA-5511", make: "Toyota", model: "Vios", year: 2021, vin: "MR053BG5400123421", color: "ស", mileage: 55020, lastService: "2026-04-04", nextService: "2026-07-04", owner: "CU-1008", status: "ok" },
    { id: "VE-2012", plate: "1AA-5512", make: "Toyota", model: "Vios", year: 2021, vin: "MR053BG5400123455", color: "ស", mileage: 58840, lastService: "2026-03-27", nextService: "2026-06-27", owner: "CU-1008", status: "ok" },
    { id: "VE-2013", plate: "1AA-5513", make: "Honda", model: "Accord", year: 2022, vin: "1HGCV1F30LA112998", color: "ខ្មៅ", mileage: 41200, lastService: "2026-04-18", nextService: "2026-07-18", owner: "CU-1008", status: "ok" },
  ];

  const parts = [
    { id: "P-001", sku: "OIL-5W30-4L", name: "ប្រេងម៉ាស៊ីន 5W-30 (4L)", nameEn: "Engine Oil 5W-30 4L", category: "ប្រេង", supplier: "Mobil Cambodia", stock: 38, reorder: 20, price: 32, cost: 22, location: "A-01" },
    { id: "P-002", sku: "FLT-OIL-TOY", name: "តម្រងប្រេងម៉ាស៊ីន (Toyota)", nameEn: "Oil Filter Toyota", category: "តម្រង", supplier: "Denso", stock: 24, reorder: 15, price: 8.5, cost: 4.2, location: "A-04" },
    { id: "P-003", sku: "FLT-AIR-LX", name: "តម្រងខ្យល់ Lexus RX", nameEn: "Air Filter Lexus RX", category: "តម្រង", supplier: "K&N", stock: 6, reorder: 8, price: 28, cost: 16, location: "A-05" },
    { id: "P-004", sku: "BRK-PAD-FRT", name: "Pads ហ្វ្រាំងមុខ (set)", nameEn: "Brake Pads Front", category: "ហ្វ្រាំង", supplier: "Bosch", stock: 12, reorder: 6, price: 48, cost: 28, location: "B-02" },
    { id: "P-005", sku: "BRK-PAD-RR", name: "Pads ហ្វ្រាំងក្រោយ (set)", nameEn: "Brake Pads Rear", category: "ហ្វ្រាំង", supplier: "Bosch", stock: 9, reorder: 6, price: 42, cost: 24, location: "B-03" },
    { id: "P-006", sku: "BAT-65AH", name: "ថ្ម 65Ah (12V)", nameEn: "Battery 65Ah 12V", category: "អគ្គិសនី", supplier: "GS Yuasa", stock: 4, reorder: 6, price: 95, cost: 64, location: "C-01" },
    { id: "P-007", sku: "SPK-IRD-4", name: "Spark Plugs Iridium (4 pcs)", nameEn: "Spark Plugs Iridium", category: "ឆេះ", supplier: "NGK", stock: 18, reorder: 10, price: 36, cost: 18, location: "D-02" },
    { id: "P-008", sku: "TYR-265-65-17", name: "សំបកកង់ 265/65 R17", nameEn: "Tire 265/65 R17", category: "កង់", supplier: "Bridgestone", stock: 14, reorder: 8, price: 145, cost: 96, location: "E-01" },
    { id: "P-009", sku: "WPR-22IN", name: "ផ្តាក់រលក 22\" (pair)", nameEn: "Wiper 22 inch pair", category: "ផ្សេងៗ", supplier: "Bosch", stock: 22, reorder: 10, price: 18, cost: 9, location: "F-04" },
    { id: "P-010", sku: "COL-50-4L", name: "ទឹកត្រជាក់ម៉ាស៊ីន (4L)", nameEn: "Coolant 50/50 4L", category: "ប្រេង", supplier: "Toyota", stock: 3, reorder: 8, price: 22, cost: 13, location: "A-02" },
    { id: "P-011", sku: "FLT-CAB-TOY", name: "តម្រងម៉ាស៊ីនត្រជាក់", nameEn: "Cabin Filter", category: "តម្រង", supplier: "Denso", stock: 16, reorder: 8, price: 14, cost: 7, location: "A-06" },
    { id: "P-012", sku: "BRK-DSC-FRT", name: "Disc ហ្វ្រាំងមុខ", nameEn: "Brake Disc Front", category: "ហ្វ្រាំង", supplier: "Brembo", stock: 5, reorder: 4, price: 88, cost: 54, location: "B-04" },
  ];

  const jobs = [
    {
      id: "JOB-2406-088",
      title: "Oil change + filters",
      vehicle: "VE-2001",
      customer: "CU-1001",
      tech: "Sok Pheap",
      techInitials: "SP",
      techColor: "#22c55e",
      status: "diagnose",
      priority: "normal",
      created: "2026-05-17 08:42",
      promised: "2026-05-17 16:00",
      services: [
        { name: "ផ្លាស់ប្រេងម៉ាស៊ីន", hours: 0.5, rate: 18, total: 9 },
        { name: "ត្រួតពិនិត្យហ្វ្រាំង", hours: 0.5, rate: 18, total: 9 },
      ],
      partsUsed: [],
      notes: "ម្ចាស់ឡានចង់ឱ្យពិនិត្យសម្លេងហ្វ្រាំងផងដែរ",
    },
    {
      id: "JOB-2406-087",
      title: "Brake service · front pads",
      vehicle: "VE-2002",
      customer: "CU-1001",
      tech: "Nuon Vichea",
      techInitials: "NV",
      techColor: "#f5b400",
      status: "progress",
      priority: "high",
      created: "2026-05-17 07:55",
      promised: "2026-05-17 14:00",
      services: [
        { name: "ផ្លាស់ Pads ហ្វ្រាំងមុខ", hours: 1.5, rate: 22, total: 33 },
      ],
      partsUsed: [{ id: "P-004", qty: 1, price: 48 }],
      notes: "",
    },
    {
      id: "JOB-2406-086",
      title: "AC service",
      vehicle: "VE-2003",
      customer: "CU-1002",
      tech: "Heng Bopha",
      techInitials: "HB",
      techColor: "#38bdf8",
      status: "parts",
      priority: "normal",
      created: "2026-05-16 16:10",
      promised: "2026-05-17 12:00",
      services: [
        { name: "បន្ថែម Gas R134a", hours: 0.5, rate: 22, total: 11 },
        { name: "ផ្លាស់តម្រងម៉ាស៊ីនត្រជាក់", hours: 0.5, rate: 18, total: 9 },
      ],
      partsUsed: [{ id: "P-011", qty: 1, price: 14 }],
      notes: "កំពុងរង់ចាំ Cabin filter ពី Denso",
    },
    {
      id: "JOB-2406-085",
      title: "60K major service",
      vehicle: "VE-2004",
      customer: "CU-1002",
      tech: "Sok Pheap",
      techInitials: "SP",
      techColor: "#22c55e",
      status: "qc",
      priority: "high",
      created: "2026-05-16 09:20",
      promised: "2026-05-17 17:00",
      services: [
        { name: "Major service 60K", hours: 4, rate: 22, total: 88 },
        { name: "Wheel alignment", hours: 1, rate: 22, total: 22 },
      ],
      partsUsed: [
        { id: "P-001", qty: 1, price: 32 },
        { id: "P-002", qty: 1, price: 8.5 },
        { id: "P-011", qty: 1, price: 14 },
        { id: "P-007", qty: 1, price: 36 },
      ],
      notes: "ត្រួតពិនិត្យចុងក្រោយដោយ Lead",
    },
    {
      id: "JOB-2406-084",
      title: "Battery replacement",
      vehicle: "VE-2008",
      customer: "CU-1005",
      tech: "Mom Sothea",
      techInitials: "MS",
      techColor: "#a78bfa",
      status: "waiting",
      priority: "normal",
      created: "2026-05-17 09:15",
      promised: "2026-05-17 18:00",
      services: [
        { name: "ផ្លាស់ថ្ម 65Ah", hours: 0.5, rate: 18, total: 9 },
      ],
      partsUsed: [{ id: "P-006", qty: 1, price: 95 }],
      notes: "",
    },
    {
      id: "JOB-2406-083",
      title: "Tire rotation + balance",
      vehicle: "VE-2009",
      customer: "CU-1006",
      tech: "Nuon Vichea",
      techInitials: "NV",
      techColor: "#f5b400",
      status: "done",
      priority: "normal",
      created: "2026-05-16 14:00",
      promised: "2026-05-17 09:00",
      completed: "2026-05-17 09:32",
      services: [
        { name: "ផ្លាស់ទីសំបកកង់", hours: 1, rate: 22, total: 22 },
        { name: "Wheel balance 4 wheels", hours: 1, rate: 22, total: 22 },
      ],
      partsUsed: [],
      notes: "",
    },
    {
      id: "JOB-2406-082",
      title: "Engine diagnostics",
      vehicle: "VE-2007",
      customer: "CU-1004",
      tech: "Heng Bopha",
      techInitials: "HB",
      techColor: "#38bdf8",
      status: "diagnose",
      priority: "high",
      created: "2026-05-17 10:05",
      promised: "2026-05-18 12:00",
      services: [
        { name: "OBD diagnostics", hours: 1, rate: 22, total: 22 },
      ],
      partsUsed: [],
      notes: "Check engine light ភ្លឺ ⋅ កូដ P0420",
    },
    {
      id: "JOB-2406-081",
      title: "30K service",
      vehicle: "VE-2010",
      customer: "CU-1007",
      tech: "Sok Pheap",
      techInitials: "SP",
      techColor: "#22c55e",
      status: "progress",
      priority: "normal",
      created: "2026-05-17 08:00",
      promised: "2026-05-17 15:00",
      services: [
        { name: "30K service package", hours: 2.5, rate: 22, total: 55 },
      ],
      partsUsed: [
        { id: "P-001", qty: 1, price: 32 },
        { id: "P-002", qty: 1, price: 8.5 },
      ],
      notes: "",
    },
  ];

  const invoices = [
    { id: "INV-2406-072", job: "JOB-2406-083", customer: "CU-1006", vehicle: "VE-2009", issued: "2026-05-17", subtotal: 44, tax: 4.4, total: 48.4, paid: 48.4, status: "paid", method: "ABA Pay" },
    { id: "INV-2406-071", job: "JOB-2406-079", customer: "CU-1003", vehicle: "VE-2006", issued: "2026-05-16", subtotal: 142, tax: 14.2, total: 156.2, paid: 156.2, status: "paid", method: "Cash" },
    { id: "INV-2406-070", job: "JOB-2406-077", customer: "CU-1002", vehicle: "VE-2003", issued: "2026-05-15", subtotal: 320, tax: 32, total: 352, paid: 0, status: "due", method: "—", terms: "Net 30" },
    { id: "INV-2406-069", job: "JOB-2406-076", customer: "CU-1004", vehicle: "VE-2007", issued: "2026-05-15", subtotal: 88, tax: 8.8, total: 96.8, paid: 50, status: "partial", method: "Cash" },
    { id: "INV-2406-068", job: "JOB-2406-074", customer: "CU-1008", vehicle: "VE-2011", issued: "2026-05-13", subtotal: 240, tax: 24, total: 264, paid: 0, status: "overdue", method: "—", terms: "Net 45" },
    { id: "INV-2406-067", job: "JOB-2406-072", customer: "CU-1001", vehicle: "VE-2002", issued: "2026-05-12", subtotal: 78, tax: 7.8, total: 85.8, paid: 85.8, status: "paid", method: "ABA Pay" },
    { id: "INV-2406-066", job: "JOB-2406-070", customer: "CU-1006", vehicle: "VE-2009", issued: "2026-05-10", subtotal: 410, tax: 41, total: 451, paid: 451, status: "paid", method: "Wing" },
  ];

  const quotations = [
    { id: "QT-2406-031", customer: "CU-1001", vehicle: "VE-2001", created: "2026-05-15", valid: "2026-05-29", total: 248, status: "sent", items: 4 },
    { id: "QT-2406-030", customer: "CU-1006", vehicle: "VE-2009", created: "2026-05-14", valid: "2026-05-28", total: 1280, status: "accepted", items: 7 },
    { id: "QT-2406-029", customer: "CU-1007", vehicle: "VE-2010", created: "2026-05-12", valid: "2026-05-26", total: 95, status: "draft", items: 2 },
    { id: "QT-2406-028", customer: "CU-1004", vehicle: "VE-2007", created: "2026-05-10", valid: "2026-05-24", total: 540, status: "rejected", items: 5 },
    { id: "QT-2406-027", customer: "CU-1002", vehicle: "VE-2004", created: "2026-05-09", valid: "2026-05-23", total: 880, status: "accepted", items: 6 },
  ];

  const bookings = [
    { id: "BK-501", time: "08:00", duration: 1, customer: "CU-1001", vehicle: "VE-2001", service: "Oil change", tech: "Sok Pheap", status: "checked-in" },
    { id: "BK-502", time: "09:00", duration: 2, customer: "CU-1002", vehicle: "VE-2004", service: "60K service", tech: "Sok Pheap", status: "checked-in" },
    { id: "BK-503", time: "10:30", duration: 1.5, customer: "CU-1004", vehicle: "VE-2007", service: "Engine diagnostics", tech: "Heng Bopha", status: "in-progress" },
    { id: "BK-504", time: "13:00", duration: 1, customer: "CU-1003", vehicle: "VE-2006", service: "Brake inspection", tech: "Nuon Vichea", status: "confirmed" },
    { id: "BK-505", time: "14:30", duration: 2.5, customer: "CU-1006", vehicle: "VE-2009", service: "AC service + filter", tech: "Heng Bopha", status: "confirmed" },
    { id: "BK-506", time: "16:00", duration: 1, customer: "CU-1005", vehicle: "VE-2008", service: "Battery replacement", tech: "Mom Sothea", status: "confirmed" },
  ];

  const technicians = [
    { id: "T-01", name: "Sok Pheap", initials: "SP", color: "#22c55e", role: "Senior Mechanic", load: 3, capacity: 4, skills: ["Engine", "Brakes", "Diagnostics"] },
    { id: "T-02", name: "Nuon Vichea", initials: "NV", color: "#f5b400", role: "Mechanic", load: 2, capacity: 4, skills: ["Brakes", "Suspension", "Tires"] },
    { id: "T-03", name: "Heng Bopha", initials: "HB", color: "#38bdf8", role: "AC Specialist", load: 2, capacity: 3, skills: ["AC", "Electrical", "Diagnostics"] },
    { id: "T-04", name: "Mom Sothea", initials: "MS", color: "#a78bfa", role: "Apprentice", load: 1, capacity: 3, skills: ["General", "Battery", "Service"] },
  ];

  const members = [
    { id: "CU-1001", name: "Chea Vannak", tier: "Gold", points: 320, spent: 1180, joined: "2023-03-12" },
    { id: "CU-1006", name: "Hor Channa", tier: "Gold", points: 580, spent: 2680, joined: "2022-06-30" },
    { id: "CU-1004", name: "Lim Sothy", tier: "Silver", points: 142, spent: 740, joined: "2023-11-19" },
    { id: "CU-1003", name: "Som Pisey", tier: "Silver", points: 85, spent: 890, joined: "2024-07-08" },
    { id: "CU-1005", name: "Pich Sokha", tier: "Bronze", points: 40, spent: 320, joined: "2024-01-22" },
    { id: "CU-1007", name: "Yim Phally", tier: "Bronze", points: 12, spent: 120, joined: "2025-02-14" },
  ];

  // ─── Helpers ───
  const map = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]));
  const customersById = map(customers);
  const vehiclesById = map(vehicles);
  const partsById = map(parts);
  const jobsById = map(jobs);

  function vehicleLabel(v) {
    if (!v) return "—";
    return `${v.year} ${v.make} ${v.model}`;
  }

  function statusColor(s) {
    return ({
      waiting: "gray",
      diagnose: "amber",
      progress: "blue",
      parts: "orange",
      qc: "teal",
      done: "green",
      cancelled: "red",
    })[s] || "gray";
  }

  function statusLabel(s) {
    return ({
      waiting: "Waiting · រង់ចាំ",
      diagnose: "Diagnosing · ត្រួតពិនិត្យ",
      progress: "In Progress · កំពុងធ្វើ",
      parts: "Awaiting Parts · រង់ចាំ Parts",
      qc: "QC · ត្រួតពិនិត្យចុង",
      done: "Done · បានបញ្ចប់",
    })[s] || s;
  }

  function moneyUSD(n) { return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 2 }); }
  function moneyKHR(n) { return "៛" + Math.round(n * 4100).toLocaleString("en-US"); }

  return {
    customers, vehicles, parts, jobs, invoices, quotations, bookings, technicians, members,
    customersById, vehiclesById, partsById, jobsById,
    vehicleLabel, statusColor, statusLabel, moneyUSD, moneyKHR,
  };
})();

// ID generator: collision-free, year-month aware.
// Format: PREFIX-YYMM-NNN where NNN is sequential within (existingItems).
// Falls back to a random 3-digit when existingItems is unknown.
export function generateId(prefix, existingItems) {
  const now = new Date();
  const yymm = String(now.getFullYear()).slice(2) + String(now.getMonth() + 1).padStart(2, "0");
  const stem = `${prefix}-${yymm}-`;
  if (Array.isArray(existingItems)) {
    const maxSeq = existingItems
      .map(x => x.id)
      .filter(id => typeof id === "string" && id.startsWith(stem))
      .map(id => parseInt(id.slice(stem.length), 10))
      .filter(n => !isNaN(n))
      .reduce((max, n) => Math.max(max, n), 0);
    return stem + String(maxSeq + 1).padStart(3, "0");
  }
  return stem + String(Math.floor(Math.random() * 900) + 100);
}

export default GARAGE;
