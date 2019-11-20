using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class blowBirthdayCandleHandler : MonoBehaviour
{
    // Use this for initialization
    private float soundLevel;
    private bool candleIsLit, collideGhost, collidePlayer;
    public int count, maxCount;
    public float blowLevel;
    public GameObject flame, glow;
    public micInput mic;
    public Text countCandleText, interactionText;
    public playerCollisionController player;
    public ghostAI ghost;
    public ParticleSystem mParticalSystem;
    public AudioSource bDaySong;

    // jumscare
    public GameObject jumpScare;
    public AudioSource sound;

    void Start()
    {
        flame.GetComponent<GameObject>();
        glow.GetComponent<GameObject>();
        candleIsLit = true;

        bDaySong = GetComponent<AudioSource>();

        //jumpcare
        hideJumpScare(true);
        sound.GetComponent<AudioSource>();

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
            bDaySong.Play();
            hideJumpScare(false);
            StartCoroutine(delay(1));
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

    void hideJumpScare(bool b)
    {
        if (b == true)
        {
            jumpScare.GetComponent<Renderer>().enabled = false;
            jumpScare.GetComponent<CapsuleCollider>().enabled = false;

        }
        else
        {
            jumpScare.GetComponent<Renderer>().enabled = true;
            jumpScare.GetComponent<CapsuleCollider>().enabled = false;

        }

    }

    IEnumerator delay(int n)
    {
        print(Time.time);
        hideJumpScare(false);
        sound.Play();

        yield return new WaitForSeconds(n);
        print(Time.time);
        hideJumpScare(true);
    }
}
