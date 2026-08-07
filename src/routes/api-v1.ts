import { Router } from "express";
import { userRouter } from "../modules/users/user.routes";
import { incomeRouter } from "../modules/incomes/income.routes";
import { expenseRouter } from "../modules/expenses/expense.routes";
import { debtRouter } from "../modules/debts/debt.routes";
import { subscriptionRouter } from "../modules/subscriptions/subscription.routes";
import { capitalRouter } from "../modules/capital/capital.routes";
import { reportRouter } from "../modules/reports/report.routes";
import { exportRouter } from "../modules/exports/export.routes";
import { settingsRouter } from "../modules/settings/settings.routes";
import { dashboardRouter } from "../modules/dashboard/dashboard.routes";

export const apiV1Router = Router();

apiV1Router.use("/users", userRouter);
apiV1Router.use("/incomes", incomeRouter);
apiV1Router.use("/expenses", expenseRouter);
apiV1Router.use("/debts", debtRouter);
apiV1Router.use("/subscriptions", subscriptionRouter);
apiV1Router.use("/capital", capitalRouter);
apiV1Router.use("/reports", reportRouter);
apiV1Router.use("/exports", exportRouter);
apiV1Router.use("/settings", settingsRouter);
apiV1Router.use("/dashboard", dashboardRouter);
