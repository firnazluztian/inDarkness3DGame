using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.AI;

public class flashLightSwitch : MonoBehaviour
{
    // Start is called before the first frame update
    public Light flash;
    public GameObject player;
    public NavMeshAgent ghost;
    private bool flashIsOn;
    //public float timeLeft = 10;

    void Start()
    {
        flash = GetComponent<Light>();
        // flash is on by default
        flashIsOn = true;
    }

    // Update is called once per frame
    void Update()
    {
        //timeLeft -= Time.deltaTime;
        // if its already on then turn it off
        // if its off then turn the flash on
        if (Input.GetKeyDown("q"))//if ((flashIsOn == true) || Input.GetKeyDown("q"))
        {
            if (flashIsOn == true)
            {
                flash.color = Color.black; 
                flashIsOn = false;
                //timeLeft = 10;
            } else {
                // if flash is turned on the ghost starts chasing
                flash.color = Color.white;
                flashIsOn = true;
            }

        }
    }
}
