import { Router } from "express";
import { userRouter } from "../modules/users/user.routes";

export const apiV1Router = Router();

apiV1Router.use("/users", userRouter);
