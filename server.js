const pgp = require("pg-promise")();
const inquirer = require("inquirer");
const db = pgp("postgres://postgres:password7@localhost:5432/employees_db");

const mainMenu = () => {
  inquirer
    .prompt([
      {
        type: "list",
        name: "menu",
        message: "What would you like to do?",
        choices: [
          "View all departments",
          "View all roles",
          "View all employees",
          "Add a department",
          "Add a role",
          "Add an employee",
          "Update an employee role",
        ],
      },
    ])
    .then((data) => {
      switch (data.menu) {
        case "View all departments":
          viewDepartments();
          break;
        case "View all roles":
          viewRoles();
          break;
        case "View all employees":
          viewEmployees();
          break;
        case "Add a department":
          addDepartment();
          break;
        case "Add a role":
          addRole();
          break;
        case "Add an employee":
          addEmployee();
          break;
        case "Update an employee role":
          updateEmployeeRole();
          break;
      }
    });
};

const updateEmployeeRole = async () => {
  const employees = await db.any(
    "SELECT id, CONCAT(first_name, ' ', last_name) AS full_name FROM employee"
  );
  const roles = await db.any("SELECT id, title FROM role");

  const data = await inquirer.prompt([
    {
      type: "list",
      name: "employeeId",
      message: "Which employee would you like to update?",
      choices: employees.map((employee) => ({
        name: employee.full_name,
        value: employee.id,
      })),
    },
    {
      type: "list",
      name: "roleId",
      message: "What is the employee's new role?",
      choices: roles.map((role) => ({ name: role.title, value: role.id })),
    },
  ]);

  await db.none("UPDATE employee SET role_id = $1 WHERE id = $2", [
    data.roleId,
    data.employeeId,
  ]);

  console.log("Employee role updated successfully.");

  mainMenu();
};
const addRole = () => {
  db.any("SELECT name AS name, id AS value FROM department")
    .then((data) => {
      return inquirer.prompt([
        {
          type: "input",
          name: "newRole",
          message: "What is the name of the new role?",
        },
        {
          type: "input",
          name: "salary",
          message: "What is the salary of the new role?",
        },

        {
          type: "list",
          name: "department",
          message: "What is the department of the new role?",
          choices: data,
        },
      ]);
    })

    .then((data) => {
      db.none(
        "INSERT INTO role(title, salary, department_id) VALUES($1, $2, $3)",
        [data.newRole, data.salary, data.department]
      );
      mainMenu();
    });
};

const addEmployee = async () => {
  const roles = await db.any("SELECT id, title FROM role");
  const managers = await db.any(
    "SELECT id, CONCAT(first_name, ' ', last_name) AS full_name FROM employee WHERE id != $1",
    [-1] // Exclude the special manager value from the list of managers
  );

  const data = await inquirer.prompt([
    {
      type: "input",
      name: "firstName",
      message: "What is the employee's first name?",
    },
    {
      type: "input",
      name: "lastName",
      message: "What is the employee's last name?",
    },
    {
      type: "list",
      name: "roleId",
      message: "What is the employee's role?",
      choices: roles.map((role) => ({ name: role.title, value: role.id })),
    },
    {
      type: "list",
      name: "managerId",
      message: "Who is the employee's manager?",
      choices: [
        { name: "No manager", value: -1 },
        ...managers.map((manager) => ({
          name: manager.full_name,
          value: manager.id,
        })),
      ],
    },
  ]);

  // Handle "No manager" case
  const managerId = data.managerId === -1 ? null : data.managerId;

  await db.none(
    "INSERT INTO employee(first_name, last_name, role_id, manager_id) VALUES($1, $2, $3, $4)",
    [data.firstName, data.lastName, data.roleId, managerId]
  );

  mainMenu();
};

const addDepartment = async () => {
  const data = await inquirer.prompt([
    {
      type: "input",
      name: "newDepartment",
      message: "What is the name of the new department?",
    },
  ]);
  db.none("INSERT INTO department(name) VALUES($1)", [data.newDepartment]);
  mainMenu();
};
const viewDepartments = () => {
  db.any("SELECT * FROM department").then((data) => {
    console.table(data);
    mainMenu();
  });
};

const viewRoles = () => {
  db.any(
    "SELECT role.title, role.salary, department.name AS department FROM role join department on role.department_id = department.id"
  ).then((data) => {
    console.table(data);
    mainMenu();
  });
};

const viewEmployees = () => {
  db.any(
    "SELECT employee.first_name, employee.last_name, role.title, department.name AS department, role.salary, CONCAT(manager.first_name, ' ', manager.last_name) AS manager FROM employee join role on employee.role_id = role.id join department on role.department_id = department.id left join employee manager on employee.manager_id = manager.id"
  ).then((data) => {
    console.table(data);
    mainMenu();
  });
};

mainMenu();
