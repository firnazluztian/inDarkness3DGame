using UnityEngine;
using UnityEngine.UI;
using System.Collections;

public class blowHandler : MonoBehaviour
{
    // Use this for initialization
    private float soundLevel;
    private bool candleIsLit, collideGhost, collidePlayer;
    public int count, maxCount;
    public float blowLevel;
    public GameObject flame, glow;
    public micInput mic;
    public Text countCandleText, interactionText, instructionText;
    public playerCollisionController player;
    public ghostAI ghost;
    public ParticleSystem mParticalSystem;

    void Start()
    {
        flame.GetComponent<GameObject>();
        glow.GetComponent<GameObject>();
        candleIsLit = true;

        // can be initialized in inspector as well
        //blowLevel = 5f;
        // max candle in a session
        player.candleCount = 0;
    }

    // Update is called once per frame
    void Update()
    {
        player = FindObjectOfType<playerCollisionController>();
        ghost = FindObjectOfType<ghostAI>();
        mic = FindObjectOfType<micInput>();
        soundLevel = mic.testSound;
        maxCount = ghost.goal.Length;

        countCandleText.text = player.candleCount + " candle(s) blown out of " + maxCount;
        if (player.candleCount >= maxCount)
        {
            //instructionText.text = "Nice! now escape the mansion by going to the exit" + System.Environment.NewLine +
            //"but watch out mummy is in rage mode his speed is doubled!!";
            instructionText.text = "Nice! now escape the mansion by going to the exit";
        } else {
            instructionText.text = "Find " + (maxCount - player.candleCount) + " candle(s) to escape";

        }
        blowCandle();
    }

    void blowCandle()
    {
        if (candleIsLit && soundLevel >= blowLevel && collidePlayer == true)
        {
            flame.GetComponent<Renderer>().enabled = false;
            glow.GetComponent<Renderer>().enabled = false;

            player.candleCount = player.candleCount + 1;
            candleIsLit = false;

            //play smoke animation
            mParticalSystem.GetComponent<ParticleSystem>().Play();
        }
        if (candleIsLit && Input.GetKeyDown(KeyCode.B) && collidePlayer == true)
        {
            flame.GetComponent<Renderer>().enabled = false;
            glow.GetComponent<Renderer>().enabled = false;

            player.candleCount = player.candleCount + 1;
            candleIsLit = false;

            //play smoke animation
            mParticalSystem.GetComponent<ParticleSystem>().Play();
        }
        else if (candleIsLit == false && Input.GetKeyDown(KeyCode.L) && collidePlayer == true)
        {
            flame.GetComponent<Renderer>().enabled = true;
            glow.GetComponent<Renderer>().enabled = true;

            player.candleCount = player.candleCount - 1;
            candleIsLit = true;
        }
        else if (candleIsLit == false && collideGhost == true)
        {
            flame.GetComponent<Renderer>().enabled = true;
            glow.GetComponent<Renderer>().enabled = true;

            player.candleCount = player.candleCount - 1;
            candleIsLit = true;

            interactionText.text = "aww shit. the ghost turned the candle back on";
        }

    }

    private void OnTriggerEnter(Collider collision)
    {
        if (collision.gameObject.CompareTag("ghost"))
        {
            collideGhost = true;
        }
    }

    private void OnTriggerExit(Collider collision)
    {
        if (collision.gameObject.CompareTag("ghost"))
        {
            collideGhost = false;
        }
    }

    private void OnCollisionEnter(Collision collision)
    {
        if (collision.gameObject.CompareTag("Player"))
        {
            collidePlayer = true;
        }
    }

    private void OnCollisionExit(Collision collision)
    {
        if (collision.gameObject.CompareTag("Player"))
        {
            collidePlayer = false;
        }
    }
}
