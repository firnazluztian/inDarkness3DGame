using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class jumpScareEffect : MonoBehaviour
{
    // Start is called before the first frame update
    private bool flashIsOn;
    private int randomNumber;
    public GameObject jumpScare;
    public AudioSource sound;
    void Start()
    {
        flashIsOn = true;
        randomNumber = 0;
        hideJumpScare(true);
        sound.GetComponent<AudioSource>();
    }

    // Update is called once per frame
    void Update()
    {
        if (Input.GetKeyDown("q"))
        {
            if (flashIsOn == true)
            {
                hideJumpScare(true);
                flashIsOn = false;
            }
            else
            {
                // generate random number from 0 to (n-1)
                randomNumber = UnityEngine.Random.Range(0, 4);
                //25% ghost will appear
                //randomNumber = 3;
                if (randomNumber == 3) {
                    hideJumpScare(false);
                    // delay n second before ghost dissapear
                    StartCoroutine(delay(1));
                } else {
                    hideJumpScare(true);

                }
                flashIsOn = true;
            }
        }

    }
    void hideJumpScare(bool b) {
        if (b == true) {
            jumpScare.GetComponent<Renderer>().enabled = false;
            jumpScare.GetComponent<CapsuleCollider>().enabled = false;
           
        } else {
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
