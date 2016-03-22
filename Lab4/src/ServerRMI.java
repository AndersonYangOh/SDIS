import java.rmi.Remote;
import java.rmi.RemoteException;

public interface ServerRMI extends Remote {
    String request(Request request) throws RemoteException;
}
