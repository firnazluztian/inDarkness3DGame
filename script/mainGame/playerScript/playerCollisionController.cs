using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;


public class playerCollisionController : MonoBehaviour{
    public Text countText;
    public Text winText;
    public Text instructionText;
    public Text interactionText;
    public GameObject portal;
    public AudioSource colSound, winSound, loseSound;
    public GameObject jumpScare, ghost;

    public int keyCount, hpCount, candleCount;
    private bool win, pickUpAllowed;

    void Start() {
        Cursor.lockState = CursorLockMode.Locked;
        // initial jumpscare
        jumpScare.GetComponent<Renderer>().enabled = false;

        // initial state
        keyCount = 0;
        candleCount = 0;
        //hpCount = 3;
        SetCountText();
        winText.text = "";
        win = true;

        interactionText.gameObject.SetActive(false);
        //portal.GetComponent<Renderer>().material.color = Color.red;
        colSound = GetComponent<AudioSource>();
        winSound = GetComponent<AudioSource>();
        loseSound = GetComponent<AudioSource>();
        //countText.text = hpCount.ToString() + " Lives remaining";
    }

    void Update()
    {
        // pick up the object and destroys it
        if (pickUpAllowed && Input.GetKeyDown(KeyCode.C))
        {
            pickUp();
        }

    }
    void FixedUpdate() {}

    void OnTriggerEnter(Collider other) {
        // handle collision with food objects 

        if (other.gameObject.CompareTag("food")) {
            interactionText.text = "hit C to collect item";
            interactionText.gameObject.SetActive(true);
            pickUpAllowed = true;
        }

        // handle collision with the ghost object
        else if (other.gameObject.CompareTag("ghost")) {
            Destroy(ghost);
            jumpScare.GetComponent<Renderer>().enabled = true;
            loseSound.Play();
            Cursor.lockState = CursorLockMode.None;
            winText.text = "You are dead!";
            StartCoroutine(delay(false, 2));


            // decrease life by 1 each time until zero
            hpCount = hpCount - 1;
            //restartLevel();
        }
        // handle exit 
        else if (other.gameObject.CompareTag("exit"))
        {
            if (candleCount < 5)
            {
                instructionText.text = "First, you must find all the candles to unlock the door";
            }
            else
            {
                winText.text = "you have escaped! you won!!";
                winSound.Play();
                StartCoroutine(delay(true, 2));
            }
        }
    }

    void OnTriggerExit(Collider other)
    {
        if (other.gameObject.CompareTag("food"))
        {
            interactionText.gameObject.SetActive(false);
            pickUpAllowed = false;
        }
    }

    private void OnCollisionEnter(Collision collision)
    {
        if (collision.gameObject.CompareTag("Door"))
        {
            interactionText.text = "hit E to enter / close the door";
            interactionText.gameObject.SetActive(true);
        }
        else if (collision.gameObject.CompareTag("Candle")) 
        {
            interactionText.text = "blow or hit B to put out the the flame" + System.Environment.NewLine + "or hit L to lit the candle";
            interactionText.gameObject.SetActive(true);
        }

    }

    private void OnCollisionExit(Collision collision)
    {
        if (collision.gameObject.CompareTag("Door"))
        {
            interactionText.gameObject.SetActive(false);
        } 
        else if (collision.gameObject.CompareTag("Candle")) 
        {
            interactionText.gameObject.SetActive(false);
        }
    }

    void SetCountText() {
        if (candleCount >= 5) {
            //instructionText.text = "Nice! now escape the mansion by going to the exit"+ System.Environment.NewLine + 
            //"but watch out ghost is in rage mode his speed is doubled!!";
            //portal.GetComponent<Renderer>().material.color = Color.green;
            instructionText.text = "Nice! now escape the mansion by going to the exit";

        }
        else {
            //instructionText.text = "Blow " + (5 - candleCount) + " more candle(s) to unlock the exit door while evading the ghost!";
        }
    }

    void gameOver() {
        SceneManager.LoadScene("GameMenu");
    }

    void restartLevel() {
        SceneManager.LoadScene("GameMenu");
    }

    void Quit() {
        //If we are running in a standalone build of the game
        #if UNITY_STANDALONE
                //Quit the application
                Application.Quit();
        #endif

                //If we are running in the editor
        #if UNITY_EDITOR
                //Stop playing the scene
                UnityEditor.EditorApplication.isPlaying = false;
        #endif
    }

    IEnumerator delay(bool b,int n)
    {
        yield return new WaitForSeconds(n);
        if (win == b) {
            gameOver();
        }
        else {
            restartLevel();
        }
    }

    void pickUp()
    {
        interactionText.gameObject.SetActive(false);
        colSound.Play();
        candleCount = candleCount + 1;
        SetCountText();
    }
}

