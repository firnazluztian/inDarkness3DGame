using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class collisionSounds : MonoBehaviour
{
    // Start is called before the first frame update
    public AudioClip winSound, loseSound, colSound;
    public AudioSource mAudioSource;
    void Start()
    {
        mAudioSource = GetComponent<AudioSource>();
    }

    // Update is called once per frame
    void Update()
    {
        
    }

    private void OnTriggerEnter(Collider other)
    {
        if (other.gameObject.CompareTag("food"))
        {
            mAudioSource.clip = colSound;
            mAudioSource.Play();
        }
        else if (other.gameObject.CompareTag("ghost"))
        {
            mAudioSource.clip = loseSound;
            mAudioSource.Play();
        }
        else if (other.gameObject.CompareTag("exit")) 
        {
            mAudioSource.clip = winSound;
            mAudioSource.Play();
        }

    }
}
