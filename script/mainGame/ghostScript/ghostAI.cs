using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.AI;
using UnityEngine.UI;

public class ghostAI : MonoBehaviour
{
    public GameObject player;
    public Transform spawnPoint;
    public NavMeshAgent navGhost;
    public Text testText;
    public playerCollisionController p;
    public blowHandler bh;
    public Transform[] goal;
    public AudioSource hitCrossSound;

    public int ghostSpeed, count, candleCount;
    private bool flashIsOn, backtoSpawn, onStartSpawn;

    // Start is called before the first frame update
    void Start()
    {
        //light is on by default
        flashIsOn = true;
        backtoSpawn = false;
        onStartSpawn = true;
        navGhost = GetComponent<NavMeshAgent>();
        // ghost follows player by default until flash is turned off
        followPLayer(true);
        navGhost.speed = ghostSpeed;
        // ghost sound when being hit by objects
        hitCrossSound = GetComponent<AudioSource>();
    }

    // Update is called once per frame
    void Update()
    {
        p = FindObjectOfType<playerCollisionController>();
        bh = FindObjectOfType<blowHandler>();
        count = p.keyCount;
        candleCount = p.candleCount;
     
        if (backtoSpawn == false) {
            navGhost.SetDestination(player.transform.position);
        } else {
            navGhost.SetDestination(spawnPoint.transform.position);
        }
        
        if (Input.GetKeyDown("q"))
        {
            if (flashIsOn == true)
            {
                flashIsOn = false;
                followPLayer(false);
            }
            else
            {
                flashIsOn = true;
                followPLayer(true);
            }
        }

        // BUFF GHOST HERE
        if (count == 5) {
            navGhost.speed = ghostSpeed*2;
        }
    }

    void followPLayer(bool b) {

        if (b == true) {
            navGhost.isStopped = false;
        } else {
            navGhost.isStopped = true;
        }

    }

    private void OnTriggerEnter(Collider collision)
    {
        if (collision.gameObject.CompareTag("spawnPoint"))
        {
            backtoSpawn = false;
            navGhost.speed = ghostSpeed;
            
        }
        else if (collision.gameObject.CompareTag("PickableObject"))
        {
            backtoSpawn = true;
            navGhost.speed = ghostSpeed * 5;

        }
    }

    private void OnCollisionEnter(Collision collision)
    {
        if (collision.gameObject.CompareTag("PickableObject"))
        {
            hitCrossSound.Play();
        }

    }
}
