package Utils;

public class Timeout implements Runnable{
    boolean done = false;
    int delay = 0;
    public Timeout(int delay) {
        this.delay = delay;
    }
    @Override
    public void run() {
        try {
            Thread.sleep(delay);
        } catch (InterruptedException e) { e.printStackTrace(); }
        done = true;
    }

    public boolean timedOut() { return done; }
}
