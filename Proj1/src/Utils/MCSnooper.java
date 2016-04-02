package Utils;

import Listener.MCastSocketListener;
import Protocol.Handler.LogHandler;

import java.net.InetAddress;
import java.net.UnknownHostException;

public class MCSnooper {
        public static void main(String[] args) throws UnknownHostException {
                MCastSocketListener mc, mdb, mdr;
                InetAddress addr = InetAddress.getByName("224.0.0.0");

                mc = new MCastSocketListener(addr, 8000, "MC ");
                mdb = new MCastSocketListener(addr, 8001, "MDB");
                mdr = new MCastSocketListener(addr, 8002, "MDR");
                new Thread(mc).start();
                new Thread(mdb).start();
                new Thread(mdr).start();

                mc.addHandler(new LogHandler());
                mdb.addHandler(new LogHandler());
                mdr.addHandler(new LogHandler());

                System.out.println("+---------------+");
                System.out.println("| SNOOPER READY |");
                System.out.println("+---------------+");
        }
}
