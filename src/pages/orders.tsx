import { useSession } from "next-auth/client";
import React, { FC } from "react";
import { db } from "../../firebase";
import Header from "../components/Header";
import moment from "moment";
import Order from "../components/Order";
import { getSession } from "next-auth/client";
import { OrderType } from "@type/order";
import { GetServerSideProps } from "next";

interface OrdersProps {
  orders: OrderType[];
}

const Orders: FC<OrdersProps> = ({ orders }) => {
  const [session] = useSession();

  return (
    <div>
      <Header />

      <main className="max-w-screen-lg mx-auto p-10">
        <h1 className="text-3xl border-b mb-2 pb-1 border-yellow-400">
          Your Orders
        </h1>

        {session ? (
          <h2>{orders && orders?.length} Orders</h2>
        ) : (
          <h2>Please sign in to see your orders</h2>
        )}

        <div className="mt-5 space-y-4">
          {orders && orders?.map((order) => <Order data={order} />)}
        </div>
      </main>
    </div>
  );
};

export default Orders;

export const getServerSideProps: GetServerSideProps = async (context) => {
  const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

  // Get the users logged in credentials
  const session = await getSession(context);

  if (!session) {
    return { props: {} };
  }

  const stripeOrders = await db
    .collection("users")
    .doc(session?.user?.email as string)
    .collection("orders")
    .orderBy("timestamp", "desc")
    .get();

  const orders = await Promise.all(
    stripeOrders.docs.map(async (order) => ({
      id: order.id,
      amount: order.data().amount,
      amountShipping: order.data().amount_shipping,
      images: order.data().images,
      timestamp: moment(order.data().timestamp.toDate()).unix(),
      items: (
        await stripe.checkout.sessions.listLineItems(order.id, {
          limit: 100,
        })
      ).data,
    }))
  );

  return {
    props: {
      orders,
      session,
    },
  };
};
