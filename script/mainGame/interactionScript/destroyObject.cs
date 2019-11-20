using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class destroyObject : MonoBehaviour
{
    //private bool pickUpAllowed;
 
    // Start is called before the first frame update
    void Start()
    {

    }

    // Update is called once per frame
    void Update()
    {
        //if (pickUpAllowed && Input.GetKeyDown(KeyCode.C)) {
        //    pickUp();
        //}
    }

    private void OnCollisionEnter(Collision collision)
    {
        if (collision.gameObject.CompareTag("ghost"))
        {
            Destroy(gameObject);
        }
    }

    void pickUp() {
        Destroy(gameObject);
    }
} 

