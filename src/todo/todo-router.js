/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const path = require("path");
const express = require("express");
const xss = require("xss");
const TodoService = require("./todo-service");
const { title } = require("process");

const TodoRouter = express.Router();
const jsonParser = express.json();

const serializeTodo = (todo) => ({
  id: todo.id,
  title: xss(todo.title),
  completed: todo.completed,
});

TodoRouter.route("/")
  .get((req, res, next) => {
    const db = req.app.get("db");

    TodoService.getTodos(db)
      .then((todos) => {
        res.json(todos.map(serializeTodo));
      })
      .catch(next);
  })
  .post(jsonParser, (req, res, next) => {
    const { title, completed = false } = req.body;
    const newTodo = { title };

    for (const [key, value] of Object.entries(newTodo))
      if (value == null)
        return res.status(400).json({
          error: { message: `Missing '${key}' in request body` },
        });
    newTodo.completed = completed;

    const db = req.app.get("db");

    TodoService.insertTodo(db, newTodo)
      .then((todos) => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${todos.id}`))
          .json(serializeTodo(todos));
      })
      .catch(next);
  });

TodoRouter.route("/:todo_id")
  .all((req, res, next) => {
    if (isNaN(parseInt(req.params.todo_id))) {
      return res.status(404).json({
        error: { message: `Invalid id` },
      });
    }
    TodoService.getTodoById(req.app.get("db"), req.params.todo_id)
      .then((todo) => {
        if (!todo) {
          return res.status(404).json({
            error: { message: `Todo doesn't exist` },
          });
        }
        res.todo = todo;
        next();
      })
      .catch(next);
  })
  .get((req, res, next) => {
    res.json(serializeTodo(res.todo));
  })
  .delete((req, res, next) => {
    const db = req.app.get("db");

    TodoService.deleteTodo(db, req.params.todo_id)
      .then(() => {
        res.status(204).end();
      })
      .catch(next);
  })
  .patch(jsonParser, (req, res, next) => {
    const { title, completed } = req.body;
    const todoToUpdate = { title };

    const numberOfValues = Object.values(todoToUpdate).filter(Boolean).length;
    if (numberOfValues === 0)
      return res.status(400).json({
        error: {
          message: `Request body must content either 'title' or 'completed'`,
        },
      });

    const db = req.app.get("db");

    TodoService.updateTodo(db, req.params.todo_id, todoToUpdate)
      .then((updatedTodo) => {
        res.status(200).json(serializeTodo(updatedTodo[0]));
      })
      .catch(next);
  });

module.exports = TodoRouter;
